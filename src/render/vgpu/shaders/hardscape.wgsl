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
  var base = vec3f(0.37, 0.30, 0.21);

  if (kind == 0u) {
    let broad = hash21(floor(input.world.xz * 4.8) + vec2f(seed * 17.0, seed * 5.0));
    let grain = hash21(floor(input.world.xz * 19.0) + vec2f(seed * 37.0, seed * 19.0));
    let fleck = hash21(floor(input.world.xz * 34.0) + vec2f(seed * 53.0, seed * 31.0));
    let bed_distance = nearest_bed_edge_distance(input.world.xz);
    let earth_mix = 1.0 - smoothstep(0.34, 1.05, bed_distance);

    let meadow = mix(
      vec3f(0.15, 0.285, 0.070),
      vec3f(0.335, 0.465, 0.145),
      0.26 + broad * 0.58 + grain * 0.08,
    );
    let packed = mix(
      vec3f(0.30, 0.225, 0.135),
      vec3f(0.47, 0.355, 0.205),
      0.18 + broad * 0.56 + grain * 0.15,
    );
    base = mix(meadow, packed, earth_mix);

    let dry_thatch = smoothstep(0.78, 0.98, fleck) * (1.0 - earth_mix * 0.72);
    base += vec3f(0.055, 0.038, 0.010) * dry_thatch;
    let tiny_stone = smoothstep(0.945, 0.995, grain) * earth_mix;
    base = mix(base, vec3f(0.43, 0.42, 0.35), tiny_stone * 0.26);
    base *= 0.94 + normal.y * 0.06;
  } else if (kind == 1u) {
    let mineral = hash21(floor(input.world.xz * 10.0) + vec2f(seed * 29.0, seed * 43.0));
    let fleck = hash21(floor(input.world.xz * 31.0) + vec2f(seed * 11.0, seed * 67.0));
    base = mix(vec3f(0.44, 0.43, 0.39), vec3f(0.67, 0.61, 0.50), mineral * 0.68);
    base = mix(base, vec3f(0.30, 0.32, 0.30), smoothstep(0.92, 0.99, fleck) * 0.28);
    if (part > 0.5) {
      base *= 0.78;
    }
    let moss_noise = hash21(floor(input.world.xz * 5.0) + vec2f(seed * 71.0, seed * 13.0));
    let moss = smoothstep(0.80, 0.98, moss_noise) * smoothstep(0.55, 0.92, normal.y);
    base = mix(base, vec3f(0.33, 0.39, 0.23), moss * 0.34);
  } else {
    let grain_axis = select(input.world.y * 9.0, input.world.x * 4.5 + input.world.z * 4.5, part > 0.5);
    let long_grain = 0.5 + 0.5 * sin(grain_axis + seed * 21.0);
    let knot = smoothstep(
      0.90,
      0.987,
      hash21(floor(input.world.xz * 8.0 + input.world.yy * 5.0) + vec2f(seed * 31.0, seed * 47.0)),
    );
    base = mix(vec3f(0.28, 0.17, 0.088), vec3f(0.50, 0.31, 0.14), long_grain * 0.54);
    base = mix(base, vec3f(0.19, 0.12, 0.065), knot * 0.36);
    if (part > 0.5) {
      base *= 0.93;
    }
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
