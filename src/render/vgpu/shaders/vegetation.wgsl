struct Uniforms {
  viewProjection: mat4x4f,
  cameraPosition: vec4f,
  scene: vec4f,
  lightDirection: vec4f,
  lightColor: vec4f,
  ambientColor: vec4f,
  fogColor: vec4f,
  lightParams: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexIn {
  @location(0) local_position: vec3f,
  @location(1) local_normal: vec3f,
  @location(2) part: f32,
  @builtin(instance_index) instance_index: u32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) world: vec3f,
  @location(2) blade: vec4f,
  @location(3) flower: f32,
  @location(4) tone: vec2f,
};

fn hash11(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
}

fn hash21(value: vec2f) -> f32 {
  return fract(sin(dot(value, vec2f(127.1, 311.7))) * 43758.5453);
}

fn value_noise(value: vec2f) -> f32 {
  let base = floor(value);
  let fraction = fract(value);
  let blend = fraction * fraction * (3.0 - 2.0 * fraction);
  let a = hash21(base);
  let b = hash21(base + vec2f(1.0, 0.0));
  let c = hash21(base + vec2f(0.0, 1.0));
  let d = hash21(base + vec2f(1.0, 1.0));
  return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
}

fn rotate2(value: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(value.x * c - value.y * s, value.x * s + value.y * c);
}

// WGSL mirror of terrain-surface.ts. Vegetation roots use the same analytic
// height field as the hardscape mesh, including the broad distant country.
fn terrain_height_at(x: f32, z: f32) -> f32 {
  let dx = max(0.0, abs(x) - 3.20);
  let dz = max(0.0, abs(z) - 2.55);
  let outside_bed_field = length(vec2f(dx, dz));
  let inner_influence = 1.0 - smoothstep(0.05, 1.35, outside_bed_field);
  let broad = value_noise(vec2f(x * 0.55, z * 0.55)) - 0.5;
  let fine = value_noise(vec2f(x * 1.9 + 6.4, z * 1.9 - 3.8)) - 0.5;
  let broad_amplitude = mix(0.036, 0.016, inner_influence);
  let fine_amplitude = mix(0.008, 0.012, inner_influence);
  let local_surface = mix(-0.378, -0.205, inner_influence)
    + broad * broad_amplitude
    + fine * fine_amplitude;

  let radius = length(vec2f(x, z));
  let far_influence = smoothstep(12.0, 38.0, radius);
  let distant_broad = value_noise(vec2f(x * 0.031 + 8.7, z * 0.031 - 4.9)) - 0.5;
  let distant_medium = value_noise(vec2f(x * 0.071 - 12.4, z * 0.071 + 6.2)) - 0.5;
  let far_rise = far_influence * (
    3.15
    + distant_broad * 2.20
    + distant_medium * 1.10
  );
  return local_surface + far_rise;
}

fn road_center_z(x: f32) -> f32 {
  let distance = max(0.0, x - 4.65);
  return 0.20 + sin(distance * 0.31) * 0.48 + sin(distance * 0.12 + 0.7) * 0.24;
}

fn near_vegetation_root(index: u32) -> vec3f {
  let region = index % 8u;
  let serial = f32(index / 8u);
  let region_f = f32(region);
  let along = hash11(serial * 17.0 + region_f * 31.0 + 1.0);
  let depth = hash11(serial * 23.0 + region_f * 47.0 + 5.0);
  let wiggle = (hash11(serial * 59.0 + region_f * 73.0 + 17.0) - 0.5) * 0.34;
  var x = 0.0;
  var z = 0.0;

  // Four fence-foot families, with the east family explicitly split around
  // the gate rather than recreating a rectangular grass ring.
  if (region == 0u) {
    x = -4.65 + along * 9.30;
    z = -3.48 - depth * 0.78 + wiggle;
  } else if (region == 1u) {
    x = -4.65 + along * 9.30;
    z = 3.48 + depth * 0.82 + wiggle;
  } else if (region == 2u) {
    x = -4.70 - depth * 0.76 + wiggle;
    z = -3.30 + along * 6.60;
  } else if (region == 3u) {
    x = 4.72 + depth * 0.64 + wiggle;
    if (along < 0.5) {
      z = -1.34 - along * 4.0;
    } else {
      z = 1.34 + (along - 0.5) * 4.0;
    }
  } else if (region == 4u || region == 5u) {
    // Uneven road verges carry detailed grass close to the gate/work corner.
    x = 5.10 + along * 9.30;
    let side = select(-1.0, 1.0, region == 5u);
    z = road_center_z(x) + side * (0.92 + depth * 0.58) + wiggle * 0.55;
  } else if (region == 6u) {
    // Work-corner weeds, biased toward hay/crate edges rather than wheel paths.
    x = 6.20 + along * 5.70;
    z = 1.75 + depth * 2.20 + wiggle;
  } else {
    // Sparse corner clumps break the remaining fence regularity.
    let corner = u32(floor(along * 4.0));
    let local_a = hash11(serial * 89.0 + 13.0);
    let local_b = hash11(serial * 97.0 + 29.0);
    x = select(-5.25 - local_a * 1.35, 5.20 + local_a * 1.20, corner == 1u || corner == 2u);
    z = select(-4.05 - local_b * 1.15, 4.05 + local_b * 1.10, corner >= 2u);
  }

  return vec3f(x, terrain_height_at(x, z) + 0.008, z);
}

fn country_vegetation_root(index: u32, cluster: u32) -> vec3f {
  let instance = f32(index);
  let cluster_f = f32(cluster);
  let a = hash11(instance * 37.0 + cluster_f * 211.0 + 7.0);
  let b = hash11(instance * 53.0 + cluster_f * 173.0 + 19.0);
  let c = hash11(instance * 71.0 + cluster_f * 137.0 + 31.0);
  let zone = (index * 2u + cluster) % 7u;
  var x = 0.0;
  var z = 0.0;

  if (zone == 0u) {
    x = 7.0 + a * 31.0;
    z = -15.0 + b * 30.0;
    let road = road_center_z(x);
    if (abs(z - road) < 2.0) {
      z = road + select(-1.0, 1.0, c > 0.5) * (2.1 + c * 1.8);
    }
  } else if (zone == 1u) {
    x = -27.0 + a * 39.0;
    z = -7.0 - b * 22.0;
  } else if (zone == 2u) {
    x = -18.0 + a * 48.0;
    z = 8.0 + b * 22.0;
  } else if (zone == 3u) {
    x = -36.0 + a * 28.0;
    z = -18.0 + b * 36.0;
  } else if (zone == 4u) {
    x = 10.0 + a * 26.0;
    z = 10.0 + b * 19.0;
  } else if (zone == 5u) {
    x = -31.0 + a * 20.0;
    z = 6.0 + b * 22.0;
  } else {
    x = -7.0 + a * 34.0;
    z = -27.0 + b * 17.0;
  }

  let jitter_x = (hash11(instance * 101.0 + cluster_f * 17.0) - 0.5) * 0.52;
  let jitter_z = (hash11(instance * 109.0 + cluster_f * 23.0) - 0.5) * 0.52;
  x += jitter_x;
  z += jitter_z;
  return vec3f(x, terrain_height_at(x, z) + 0.006, z);
}

fn leaf_angle(index: u32) -> f32 {
  if (index == 1u) { return 1.13; }
  if (index == 2u) { return 2.55; }
  if (index == 3u) { return 4.31; }
  if (index == 4u) { return 5.42; }
  return 0.0;
}

fn leaf_height(index: u32) -> f32 {
  if (index == 1u) { return 0.86; }
  if (index == 2u) { return 0.73; }
  if (index == 3u) { return 0.62; }
  if (index == 4u) { return 0.56; }
  return 1.0;
}

fn cloud_shadow(world: vec3f) -> f32 {
  let wave =
    sin(world.x * 0.48 + world.z * 0.19 + uniforms.scene.x * 0.08) +
    sin(world.z * 0.57 - world.x * 0.13 + uniforms.scene.x * 0.055) * 0.72;
  let mask = smoothstep(0.35, 1.35, wave);
  return 1.0 - uniforms.scene.z * mask * 0.24;
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  let instance = f32(input.instance_index);
  let seed = hash11(instance * 29.0 + 7.0);
  let variation = hash11(instance * 41.0 + 19.0);
  let height_seed = hash11(instance * 67.0 + 23.0);
  let color_seed = hash11(instance * 71.0 + 29.0);
  let hue_seed = hash11(instance * 83.0 + 31.0);
  let is_mid = input.part > 5.5;
  let mid_part = u32(max(0.0, input.part - 6.0) + 0.5);
  let mid_cluster = mid_part / 3u;
  let mid_active = input.instance_index < 1750u;
  let near_root = near_vegetation_root(input.instance_index);
  let mid_root = country_vegetation_root(input.instance_index, mid_cluster);
  let root = select(near_root, mid_root, is_mid);
  let near_understory = select(0.0, 1.0, hash11(instance * 17.0 + 3.0) > 0.72);
  let has_flower = hash11(instance * 43.0 + 13.0) > 0.955 && near_understory < 0.5;

  let prevailing = normalize(vec2f(-0.84, 0.54));
  let along = dot(root.xz, prevailing);
  let across = dot(root.xz, vec2f(-prevailing.y, prevailing.x));
  let long_wave = 0.5 + 0.5 * sin(
    along * 0.84 - uniforms.scene.x * 1.32 +
    0.72 * sin(across * 0.25 + uniforms.scene.x * 0.16)
  );
  let gust_front = pow(long_wave, 3.2);
  let second_band = 0.5 + 0.5 * sin(along * 0.31 - uniforms.scene.x * 0.54 + 2.1);
  let eddy =
    sin(root.x * 1.45 + uniforms.scene.x * 0.77 + variation * 6.2831853) *
    sin(root.z * 1.18 - uniforms.scene.x * 0.61);
  let direction_shift = 0.19 * eddy + 0.10 * sin(across * 0.52 + uniforms.scene.x * 0.35);
  let wind_direction = rotate2(prevailing, direction_shift);
  let wind_speed = 1.9 + uniforms.scene.y * 4.9;
  var local_speed = wind_speed * (0.46 + 0.68 * gust_front + 0.16 * second_band + 0.10 * eddy);
  local_speed = max(local_speed, 0.15);

  let height_scale = 0.88 + height_seed * 0.22;
  let canopy_height = (0.36 + seed * 0.44) * height_scale * (0.94 + 0.06 * sin(root.x * 1.1 + root.z * 0.7));
  let under_height = (0.12 + seed * 0.19) * height_scale;
  let base_height = mix(canopy_height, under_height, near_understory);
  let blade_width = mix(0.024 + variation * 0.017, 0.018 + variation * 0.010, near_understory);
  let flexibility = mix(0.70 + variation * 0.74, 0.94 + variation * 0.54, near_understory);
  let dynamic_pressure = 0.6125 * local_speed * local_speed;
  let slenderness = blade_width * base_height * base_height * base_height;
  var bend = dynamic_pressure * slenderness * flexibility * 2.05;
  bend = min(bend, 1.18);

  var world = root;
  var normal = vec3f(0.0, 1.0, 0.0);
  var height_value = 0.0;
  var flower_value = 0.0;
  var understory_value = near_understory;

  if (input.part < 4.5) {
    let leaf = u32(input.part + 0.5);
    let t = input.local_position.y;
    let leaf_seed = hash11(instance * 97.0 + f32(leaf) * 13.0 + 5.0);
    let yaw = seed * 6.2831853 + leaf_angle(leaf) + variation * 0.42 + (leaf_seed - 0.5) * 0.18;
    let blade_height = base_height * leaf_height(leaf) * (0.86 + leaf_seed * 0.28);
    let leaf_width = blade_width * (0.90 + leaf_seed * 0.18);
    let deflection_shape = t * t * (6.0 - 4.0 * t + t * t) / 3.0;
    let shape_derivative = (12.0 * t - 12.0 * t * t + 4.0 * t * t * t) / 3.0;
    let flutter =
      sin(uniforms.scene.x * 4.35 + variation * 12.0 + along * 1.12 + f32(leaf) * 1.7) *
      0.018 * t * t * t * clamp(local_speed / 7.0, 0.0, 1.0);
    let width_direction = vec2f(cos(yaw), sin(yaw));
    let width_offset = width_direction * input.local_position.x * leaf_width;
    let wind_offset = wind_direction * (bend * blade_height * 0.72 * deflection_shape + flutter * blade_height);
    world += vec3f(width_offset.x + wind_offset.x, 0.0, width_offset.y + wind_offset.y);
    world.y += t * blade_height * (1.0 - 0.19 * bend * bend * t);

    let width_tangent = normalize(vec3f(width_direction.x, 0.0, width_direction.y));
    let height_tangent = normalize(vec3f(
      wind_direction.x * bend * 0.72 * shape_derivative,
      max(0.26, 1.0 - 0.56 * bend * bend * t),
      wind_direction.y * bend * 0.72 * shape_derivative
    ));
    normal = normalize(cross(width_tangent, height_tangent));
    height_value = t;
  } else if (input.part < 5.5 && has_flower) {
    let t = 1.0;
    let deflection_shape = t * t * (6.0 - 4.0 * t + t * t) / 3.0;
    let flower_height = base_height * 1.06;
    let yaw = seed * 6.2831853 + variation * 0.6;
    let local_xz = rotate2(input.local_position.xz, yaw) * (0.075 + variation * 0.025);
    world += vec3f(local_xz.x, flower_height + (input.local_position.y - 1.02) * 0.16, local_xz.y);
    let flower_wind_offset = wind_direction * bend * flower_height * 0.72 * deflection_shape;
    world += vec3f(flower_wind_offset.x, 0.0, flower_wind_offset.y);
    let rotated_normal = rotate2(input.local_normal.xz, yaw);
    normal = normalize(vec3f(rotated_normal.x, input.local_normal.y, rotated_normal.y));
    height_value = 1.0;
    flower_value = 1.0;
  } else if (is_mid) {
    let blade = mid_part % 3u;
    let t = input.local_position.y;
    let active_factor = select(0.0, 1.0, mid_active);
    let blade_seed = hash11(instance * 113.0 + f32(blade) * 17.0 + f32(mid_cluster) * 43.0);
    let yaw = seed * 6.2831853 + f32(blade) * 1.047 + f32(mid_cluster) * 0.61 + (blade_seed - 0.5) * 0.44;
    let cluster_width = (0.38 + variation * 0.22) * active_factor;
    let cluster_height = (0.34 + seed * 0.34) * (0.86 + blade_seed * 0.25) * active_factor;
    let local_xz = rotate2(input.local_position.xz, yaw) * cluster_width;
    let mid_bend = min(0.22, local_speed * local_speed * 0.0036) * cluster_height;
    let wind_offset = wind_direction * mid_bend * t * t;
    world += vec3f(local_xz.x + wind_offset.x, t * cluster_height, local_xz.y + wind_offset.y);
    let rotated_normal = rotate2(input.local_normal.xz, yaw);
    normal = normalize(vec3f(rotated_normal.x, 0.18, rotated_normal.y));
    height_value = t;
    flower_value = -1.0;
    understory_value = 0.42;
    bend = min(1.18, mid_bend * 2.2);
  }

  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.normal = normal;
  output.world = world;
  output.blade = vec4f(height_value, variation, understory_value, clamp(bend / 1.18, 0.0, 1.0));
  output.flower = flower_value;
  output.tone = vec2f(color_seed, hue_seed);
  return output;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let height = input.blade.x;
  let variation = input.blade.y;
  let understory = input.blade.z;
  let wind_load = input.blade.w;
  let color_seed = input.tone.x;
  let hue_seed = input.tone.y;
  var albedo = vec3f(0.20, 0.45, 0.10);

  if (input.flower > 0.5) {
    let warm = select(vec3f(0.96, 0.55, 0.68), vec3f(0.98, 0.80, 0.28), variation > 0.5);
    albedo = mix(warm, vec3f(0.96, 0.91, 0.74), smoothstep(0.82, 1.0, variation) * 0.34);
  } else if (input.flower < -0.5) {
    // Mid/far clusters are deliberately lower-frequency and slightly drier than
    // the garden-edge blades, so the three grass layers remain legible.
    let low = mix(vec3f(0.095, 0.205, 0.045), vec3f(0.17, 0.29, 0.065), hue_seed);
    let high = mix(vec3f(0.31, 0.43, 0.105), vec3f(0.43, 0.49, 0.135), hue_seed);
    albedo = mix(low, high, smoothstep(0.02, 0.92, height)) * (0.84 + color_seed * 0.22);
  } else {
    let canopy = mix(vec3f(0.055, 0.18, 0.025), vec3f(0.40, 0.64, 0.14), smoothstep(0.0, 0.94, height));
    let under = mix(vec3f(0.035, 0.115, 0.018), vec3f(0.20, 0.42, 0.075), smoothstep(0.0, 0.92, height));
    let base = mix(canopy, under, understory);
    let cool_tint = vec3f(0.88, 1.06, 0.88);
    let warm_tint = vec3f(1.08, 0.97, 0.78);
    let hue_tint = mix(cool_tint, warm_tint, hue_seed);
    albedo = base * mix(vec3f(1.0), hue_tint, 0.22) * (0.78 + 0.46 * color_seed);
  }

  let normal = normalize(input.normal);
  let light_direction = normalize(uniforms.lightDirection.xyz);
  let view_direction = normalize(uniforms.cameraPosition.xyz - input.world);
  let two_sided_diffuse = abs(dot(normal, light_direction));
  let wrapped_diffuse = 0.28 + 0.72 * two_sided_diffuse;
  let back_lighting = pow(max(dot(view_direction, -light_direction), 0.0), 5.0);
  let base_occlusion = mix(
    mix(0.46, 0.34, understory),
    mix(1.0, 0.84, understory),
    smoothstep(0.02, 0.60, height)
  );
  let shadow = cloud_shadow(input.world);
  var color = albedo * base_occlusion * (
    uniforms.ambientColor.rgb * 0.90 +
    uniforms.lightColor.rgb * (0.24 + 0.92 * wrapped_diffuse) * uniforms.lightParams.x
  ) * shadow;
  color += albedo * uniforms.lightColor.rgb * back_lighting * (0.20 + 0.66 * height) * uniforms.lightParams.x * shadow;
  color *= 1.0 - 0.10 * wind_load;

  let rain = uniforms.lightParams.z;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.88, 0.95, 1.04), rain * 0.10);
  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  color = mix(color, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.84));
  return vec4f(color, 1.0);
}