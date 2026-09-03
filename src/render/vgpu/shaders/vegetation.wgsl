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
};

fn hash11(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
}

fn rotate2(value: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(value.x * c - value.y * s, value.x * s + value.y * c);
}

fn vegetation_root(index: u32) -> vec3f {
  let side = index % 4u;
  let serial = f32(index / 4u);
  let along = hash11(serial * 17.0 + f32(side) * 31.0 + 1.0);
  let depth = 0.18 + hash11(serial * 23.0 + f32(side) * 47.0 + 5.0) * 0.95;
  if (side == 0u) {
    return vec3f(-4.65 + along * 9.30, -0.39, -3.48 - depth * 0.72);
  }
  if (side == 1u) {
    return vec3f(4.72 + depth * 0.72, -0.39, -3.35 + along * 6.70);
  }
  if (side == 2u) {
    return vec3f(-4.65 + along * 9.30, -0.39, 3.48 + depth * 0.72);
  }
  return vec3f(-4.72 - depth * 0.72, -0.39, -3.35 + along * 6.70);
}

fn leaf_angle(index: u32) -> f32 {
  if (index == 1u) { return 1.13; }
  if (index == 2u) { return 2.55; }
  if (index == 3u) { return 4.31; }
  return 0.0;
}

fn leaf_height(index: u32) -> f32 {
  if (index == 1u) { return 0.86; }
  if (index == 2u) { return 0.73; }
  if (index == 3u) { return 0.62; }
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
  let seed = hash11(f32(input.instance_index) * 29.0 + 7.0);
  let variation = hash11(f32(input.instance_index) * 41.0 + 19.0);
  let root = vegetation_root(input.instance_index);
  let understory = select(0.0, 1.0, hash11(f32(input.instance_index) * 17.0 + 3.0) > 0.72);
  let has_flower = hash11(f32(input.instance_index) * 43.0 + 13.0) > 0.955 && understory < 0.5;

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

  let canopy_height = (0.38 + seed * 0.40) * (0.94 + 0.06 * sin(root.x * 1.1 + root.z * 0.7));
  let under_height = 0.14 + seed * 0.17;
  let base_height = mix(canopy_height, under_height, understory);
  let blade_width = mix(0.024 + variation * 0.017, 0.018 + variation * 0.010, understory);
  let flexibility = mix(0.70 + variation * 0.74, 0.94 + variation * 0.54, understory);
  let dynamic_pressure = 0.6125 * local_speed * local_speed;
  let slenderness = blade_width * base_height * base_height * base_height;
  var bend = dynamic_pressure * slenderness * flexibility * 2.05;
  bend = min(bend, 1.18);

  var world = root;
  var normal = vec3f(0.0, 1.0, 0.0);
  var height_value = 0.0;
  var flower_value = 0.0;

  if (input.part < 3.5) {
    let leaf = u32(input.part + 0.5);
    let t = input.local_position.y;
    let yaw = seed * 6.2831853 + leaf_angle(leaf) + variation * 0.42;
    let blade_height = base_height * leaf_height(leaf);
    let deflection_shape = t * t * (6.0 - 4.0 * t + t * t) / 3.0;
    let shape_derivative = (12.0 * t - 12.0 * t * t + 4.0 * t * t * t) / 3.0;
    let flutter =
      sin(uniforms.scene.x * 4.35 + variation * 12.0 + along * 1.12 + f32(leaf) * 1.7) *
      0.018 * t * t * t * clamp(local_speed / 7.0, 0.0, 1.0);
    let width_direction = vec2f(cos(yaw), sin(yaw));
    world.xz += width_direction * input.local_position.x * blade_width;
    world.xz += wind_direction * (bend * blade_height * 0.72 * deflection_shape + flutter * blade_height);
    world.y += t * blade_height * (1.0 - 0.19 * bend * bend * t);

    let width_tangent = normalize(vec3f(width_direction.x, 0.0, width_direction.y));
    let height_tangent = normalize(vec3f(
      wind_direction.x * bend * 0.72 * shape_derivative,
      max(0.26, 1.0 - 0.56 * bend * bend * t),
      wind_direction.y * bend * 0.72 * shape_derivative
    ));
    normal = normalize(cross(width_tangent, height_tangent));
    height_value = t;
  } else if (has_flower) {
    let t = 1.0;
    let deflection_shape = t * t * (6.0 - 4.0 * t + t * t) / 3.0;
    let flower_height = base_height * 1.06;
    let yaw = seed * 6.2831853 + variation * 0.6;
    let local_xz = rotate2(input.local_position.xz, yaw) * (0.075 + variation * 0.025);
    world += vec3f(local_xz.x, flower_height + (input.local_position.y - 1.02) * 0.16, local_xz.y);
    world.xz += wind_direction * bend * flower_height * 0.72 * deflection_shape;
    normal = normalize(vec3f(rotate2(input.local_normal.xz, yaw).x, input.local_normal.y, rotate2(input.local_normal.xz, yaw).y));
    height_value = 1.0;
    flower_value = 1.0;
  }

  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.normal = normal;
  output.world = world;
  output.blade = vec4f(height_value, variation, understory, clamp(bend / 1.18, 0.0, 1.0));
  output.flower = flower_value;
  return output;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let height = input.blade.x;
  let variation = input.blade.y;
  let understory = input.blade.z;
  let wind_load = input.blade.w;
  var albedo = vec3f(0.20, 0.45, 0.10);

  if (input.flower > 0.5) {
    let warm = select(vec3f(0.96, 0.55, 0.68), vec3f(0.98, 0.80, 0.28), variation > 0.5);
    albedo = mix(warm, vec3f(0.96, 0.91, 0.74), smoothstep(0.82, 1.0, variation) * 0.34);
  } else {
    let canopy = mix(vec3f(0.075, 0.22, 0.035), vec3f(0.38, 0.61, 0.13), smoothstep(0.0, 0.94, height));
    let under = mix(vec3f(0.045, 0.14, 0.025), vec3f(0.19, 0.39, 0.07), smoothstep(0.0, 0.92, height));
    albedo = mix(canopy, under, understory) * (0.82 + 0.30 * variation);
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
