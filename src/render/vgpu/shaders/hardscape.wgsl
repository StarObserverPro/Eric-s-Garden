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
  @location(0) world_position: vec3f,
  @location(1) world_normal: vec3f,
  @location(2) material_kind: f32,
  @location(3) material_seed: f32,
  @location(4) part: f32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) world: vec3f,
  @location(2) material_data: vec3f,
};

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

fn cloud_shadow(world: vec3f) -> f32 {
  let wave =
    sin(world.x * 0.48 + world.z * 0.19 + uniforms.scene.x * 0.08) +
    sin(world.z * 0.57 - world.x * 0.13 + uniforms.scene.x * 0.055) * 0.72;
  let mask = smoothstep(0.35, 1.35, wave);
  return 1.0 - uniforms.scene.z * mask * 0.26;
}

fn nearest_bed_edge_distance(world_xz: vec2f) -> f32 {
  var closest = 100.0;
  for (var index = 0u; index < 12u; index += 1u) {
    let column = f32(index % 4u) - 1.5;
    let row = f32(index / 4u) - 1.0;
    let center = vec2f(column * 1.65, row * 1.75);
    let from_box = abs(world_xz - center) - vec2f(0.70);
    let outside = length(max(from_box, vec2f(0.0)));
    closest = min(closest, outside);
  }
  return closest;
}

fn road_center_z(x: f32) -> f32 {
  let distance = max(0.0, x - 4.65);
  return 0.20 + sin(distance * 0.31) * 0.48 + sin(distance * 0.12 + 0.7) * 0.24;
}

fn point_contact(world_xz: vec2f, center: vec2f, radius: f32) -> f32 {
  return 1.0 - smoothstep(radius * 0.45, radius, length(world_xz - center));
}

fn work_contact(world_xz: vec2f) -> f32 {
  // Wheel/hay/tree contact is a low-frequency terrain darkening, not a shadow
  // map. The same coordinates are used by the static geometry placement.
  var mask = 0.0;
  mask = max(mask, point_contact(world_xz, vec2f(8.67, 0.12), 0.62));
  mask = max(mask, point_contact(world_xz, vec2f(8.67, 1.44), 0.62));
  mask = max(mask, point_contact(world_xz, vec2f(10.47, 0.27), 0.43));
  mask = max(mask, point_contact(world_xz, vec2f(10.47, 1.29), 0.43));
  mask = max(mask, point_contact(world_xz, vec2f(6.80, 0.64), 0.42));
  mask = max(mask, point_contact(world_xz, vec2f(6.80, 1.88), 0.42));
  mask = max(mask, point_contact(world_xz, vec2f(8.30, 2.85), 1.18));
  mask = max(mask, point_contact(world_xz, vec2f(8.93, 2.05), 0.48));
  return mask;
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(input.world_position, 1.0);
  output.normal = normalize(input.world_normal);
  output.world = input.world_position;
  output.material_data = vec3f(input.material_kind, input.material_seed, input.part);
  return output;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let kind = u32(input.material_data.x + 0.5);
  let seed = input.material_data.y;
  let part = input.material_data.z;
  let normal = normalize(input.normal);

  // Remove the two old east-side fence posts and rail fragments from the gate
  // opening. The base hardscape topology stays reusable; the visible gate leaf
  // is P0 procedural scenery in the same draw.
  if (kind == 2u && input.world.x > 4.70 && input.world.x < 4.90 && abs(input.world.z) < 1.18) {
    discard;
  }

  var base = vec3f(0.37, 0.30, 0.21);

  if (kind == 0u) {
    let broad = value_noise(input.world.xz * 0.68 + vec2f(3.7, -5.1));
    let medium = value_noise(input.world.xz * 2.65 + vec2f(-7.3, 4.6));
    let grain = value_noise(input.world.xz * 8.4 + vec2f(11.2, -2.7));
    let fleck = hash21(floor(input.world.xz * 38.0) + vec2f(17.0, 29.0));
    let bed_distance = nearest_bed_edge_distance(input.world.xz);
    let earth_mix = 1.0 - smoothstep(0.30, 1.22, bed_distance);
    let soil_apron = 1.0 - smoothstep(0.04, 0.34, bed_distance);

    let meadow = mix(
      vec3f(0.15, 0.285, 0.070),
      vec3f(0.335, 0.465, 0.145),
      0.18 + broad * 0.58 + medium * 0.15,
    );
    let packed = mix(
      vec3f(0.30, 0.225, 0.135),
      vec3f(0.47, 0.355, 0.205),
      0.16 + broad * 0.43 + medium * 0.24 + grain * 0.08,
    );
    base = mix(meadow, packed, earth_mix);

    let shoulder_loam = mix(
      vec3f(0.29, 0.175, 0.085),
      vec3f(0.43, 0.275, 0.135),
      0.30 + broad * 0.42 + medium * 0.16,
    );
    base = mix(base, shoulder_loam, soil_apron * 0.52);

    // One terrain-owned exit route. It fades in at the east gate, meanders into
    // the country and carries paired wheel ruts plus a trampled verge.
    let road_center = road_center_z(input.world.x);
    let road_distance = abs(input.world.z - road_center);
    let road_length = smoothstep(4.35, 5.30, input.world.x) * (1.0 - smoothstep(24.0, 29.0, input.world.x));
    let road_mask = (1.0 - smoothstep(0.78, 1.28, road_distance)) * road_length;
    let verge_mask = (1.0 - smoothstep(1.18, 1.88, road_distance)) * road_length;
    let rut_a = 1.0 - smoothstep(0.075, 0.20, abs((input.world.z - road_center) - 0.48));
    let rut_b = 1.0 - smoothstep(0.075, 0.20, abs((input.world.z - road_center) + 0.48));
    let rut_mask = max(rut_a, rut_b) * road_length;
    let road_earth = mix(vec3f(0.36, 0.265, 0.145), vec3f(0.49, 0.365, 0.205), broad * 0.42 + grain * 0.12);
    base = mix(base, road_earth, road_mask * 0.92);
    base = mix(base, vec3f(0.33, 0.255, 0.14), verge_mask * (1.0 - road_mask) * 0.42);
    base *= 1.0 - rut_mask * 0.16;

    // Compact work pad around tractor/trailer plus visible object-ground contact.
    let work_delta = (input.world.xz - vec2f(8.6, 1.45)) / vec2f(3.25, 2.20);
    let work_pad = (1.0 - smoothstep(0.70, 1.05, length(work_delta))) * 0.48;
    base = mix(base, vec3f(0.345, 0.265, 0.155), work_pad);
    let contact = work_contact(input.world.xz);
    base *= 1.0 - contact * 0.16;

    // Fence-foot darkening is interrupted at the east gate, preventing the old
    // closed rectangle from surviving as a material seam after its rails vanish.
    let north_south = min(abs(input.world.z - 3.55), abs(input.world.z + 3.55));
    let west = abs(input.world.x + 4.80);
    let east = abs(input.world.x - 4.80);
    let east_enabled = smoothstep(1.18, 1.55, abs(input.world.z));
    let fence_distance = min(north_south, min(west, mix(100.0, east, east_enabled)));
    let fence_contact = 1.0 - smoothstep(0.02, 0.16, fence_distance);
    base *= 1.0 - fence_contact * 0.055;

    let dry_thatch = smoothstep(0.86, 0.985, fleck) * (1.0 - earth_mix * 0.76) * (1.0 - road_mask);
    base += vec3f(0.050, 0.034, 0.009) * dry_thatch;
    let tiny_stone = smoothstep(0.91, 0.99, grain) * max(earth_mix, road_mask * 0.5);
    base = mix(base, vec3f(0.43, 0.42, 0.35), tiny_stone * 0.15);
    base *= 0.95 + normal.y * 0.05;
  } else if (kind == 1u) {
    let mineral = value_noise(input.world.xz * 4.6 + vec2f(seed * 7.0, seed * -5.0));
    let fleck = value_noise(input.world.xz * 13.5 + vec2f(seed * 17.0, seed * 9.0));
    base = mix(vec3f(0.44, 0.43, 0.39), vec3f(0.67, 0.61, 0.50), mineral * 0.68);
    base = mix(base, vec3f(0.30, 0.32, 0.30), smoothstep(0.82, 0.96, fleck) * 0.20);
    if (part > 0.5) { base *= 0.82; }
    let moss_noise = value_noise(input.world.xz * 1.9 + vec2f(seed * 5.0, seed * 11.0));
    let moss = smoothstep(0.72, 0.93, moss_noise) * smoothstep(0.55, 0.92, normal.y);
    base = mix(base, vec3f(0.33, 0.39, 0.23), moss * 0.30);
  } else if (kind == 2u) {
    let grain_axis = select(input.world.y * 9.0, input.world.x * 4.5 + input.world.z * 4.5, part > 0.5);
    let long_grain = 0.5 + 0.5 * sin(grain_axis + seed * 21.0);
    let knot_noise = value_noise(vec2f(input.world.x + input.world.z, input.world.y) * 5.4 + seed * 13.0);
    let knot = smoothstep(0.84, 0.965, knot_noise);
    base = mix(vec3f(0.28, 0.17, 0.088), vec3f(0.50, 0.31, 0.14), long_grain * 0.54);
    base = mix(base, vec3f(0.19, 0.12, 0.065), knot * 0.30);
    if (part > 0.5) { base *= 0.94; }
  } else if (kind == 3u) {
    // Early seeds are the faded green tractor body; later seeds are exposed steel.
    let worn = value_noise(input.world.xz * 5.2 + vec2f(seed * 19.0, input.world.y * 2.7));
    if (seed < 0.36) {
      base = mix(vec3f(0.16, 0.265, 0.105), vec3f(0.31, 0.39, 0.16), worn * 0.45);
      let paint_wear = smoothstep(0.82, 0.96, worn);
      base = mix(base, vec3f(0.31, 0.29, 0.24), paint_wear * 0.35);
    } else {
      base = mix(vec3f(0.25, 0.27, 0.25), vec3f(0.50, 0.49, 0.43), worn * 0.48);
    }
  } else if (kind == 4u) {
    let rubber_noise = value_noise(input.world.xz * 11.0 + vec2f(input.world.y * 3.0, seed * 23.0));
    base = mix(vec3f(0.035, 0.041, 0.034), vec3f(0.105, 0.105, 0.082), rubber_noise * 0.55);
  } else if (kind == 5u) {
    let leaf_noise = value_noise(input.world.xz * 1.7 + vec2f(input.world.y * 0.9, seed * 13.0));
    let crown_noise = value_noise(input.world.xz * 5.2 + seed * 31.0);
    base = mix(vec3f(0.065, 0.18, 0.045), vec3f(0.28, 0.43, 0.105), leaf_noise * 0.72);
    base *= 0.86 + crown_noise * 0.22;
  } else {
    let straw = value_noise(vec2f(input.world.x * 7.0 + input.world.z * 4.0, input.world.y * 12.0) + seed * 17.0);
    base = mix(vec3f(0.50, 0.34, 0.105), vec3f(0.76, 0.61, 0.235), straw * 0.70);
  }

  let rain = uniforms.lightParams.z;
  let rain_darkening = select(0.22, 0.11, kind == 2u);
  base = mix(base, base * vec3f(0.74, 0.77, 0.79), rain * rain_darkening);

  let light_direction = normalize(uniforms.lightDirection.xyz);
  let n_dot_l = max(dot(normal, light_direction), 0.0);
  let upward = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
  let wrapped = clamp((n_dot_l + 0.24) / 1.24, 0.0, 1.0);
  let shadow = cloud_shadow(input.world);
  var color = base * (
    uniforms.ambientColor.rgb * (0.56 + upward * 0.30) +
    uniforms.lightColor.rgb * (0.18 + wrapped * 0.82) * uniforms.lightParams.x
  ) * shadow;

  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.88, 0.95, 1.03), rain * 0.08);
  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  color = mix(color, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.72));
  return vec4f(color, 1.0);
}
