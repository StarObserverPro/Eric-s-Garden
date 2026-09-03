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
    let broad = hash21(floor(input.world.xz * 7.0) + vec2f(seed * 17.0, seed * 5.0));
    let grain = hash21(floor(input.world.xz * 25.0) + vec2f(seed * 37.0, seed * 19.0));
    let pebble = smoothstep(
      0.91,
      0.985,
      hash21(floor(input.world.xz * 39.0) + vec2f(seed * 53.0, seed * 31.0)),
    );
    base = mix(vec3f(0.29, 0.245, 0.175), vec3f(0.47, 0.385, 0.265), broad * 0.64 + grain * 0.14);
    base = mix(base, vec3f(0.40, 0.40, 0.35), pebble * 0.34);
    base *= 0.93 + normal.y * 0.07;
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
