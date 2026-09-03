struct Uniforms {
  viewProjection: mat4x4f,
  cameraPosition: vec4f,
  scene: vec4f,
  lightDirection: vec4f,
  lightColor: vec4f,
  ambientColor: vec4f,
  fogColor: vec4f,
  lightParams: vec4f,
  wet0: vec4f,
  wet1: vec4f,
  wet2: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexIn {
  @location(0) position: vec3f,
  @location(1) normal: vec3f,
  @location(2) plot_index: f32,
  @location(3) material_seed: f32,
  @location(4) surface_type: f32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) soil_data: vec3f,
};

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(input.position, 1.0);
  output.world = input.position;
  output.normal = input.normal;
  output.soil_data = vec3f(input.plot_index, input.material_seed, input.surface_type);
  return output;
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

fn soil_micro_height(world_xz: vec2f, seed: f32) -> f32 {
  let p = world_xz + vec2f(seed * 13.1, seed * -9.7);
  let large = value_noise(p * 12.0) - 0.5;
  let small = value_noise(p * 31.0 + vec2f(8.2, -4.7)) - 0.5;
  let grain = hash21(floor(p * 76.0) + seed * 19.0) - 0.5;
  return large * 0.0028 + small * 0.0015 + grain * 0.00055;
}

fn plot_wetness(index: u32) -> f32 {
  if (index < 4u) {
    return uniforms.wet0[index];
  }
  if (index < 8u) {
    return uniforms.wet1[index - 4u];
  }
  return uniforms.wet2[index - 8u];
}

fn cloud_shadow(world: vec3f) -> f32 {
  let time = uniforms.scene.x;
  let cloudiness = uniforms.scene.y;
  let wave =
    sin(world.x * 0.48 + world.z * 0.19 + time * 0.08) +
    sin(world.z * 0.57 - world.x * 0.13 + time * 0.055) * 0.72;
  let mask = smoothstep(0.35, 1.35, wave);
  return 1.0 - cloudiness * mask * 0.24;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let plot_index = u32(input.soil_data.x + 0.5);
  let seed = input.soil_data.y;
  let surface_type = input.soil_data.z;
  let moisture = plot_wetness(plot_index);

  let eps = 0.012;
  let h_left = soil_micro_height(input.world.xz - vec2f(eps, 0.0), seed);
  let h_right = soil_micro_height(input.world.xz + vec2f(eps, 0.0), seed);
  let h_down = soil_micro_height(input.world.xz - vec2f(0.0, eps), seed);
  let h_up = soil_micro_height(input.world.xz + vec2f(0.0, eps), seed);
  let micro_gradient = vec2f(h_right - h_left, h_up - h_down) / (2.0 * eps);
  var normal = normalize(input.normal + vec3f(-micro_gradient.x * 0.9, 0.0, -micro_gradient.y * 0.9));

  let coarse = value_noise(input.world.xz * 2.85 + seed * 7.3);
  let medium = value_noise(input.world.xz * 10.8 + vec2f(seed * 17.0, seed * -13.0));
  let grain = hash21(floor(input.world.xz * 46.0) + seed * 29.0);
  let mineral = hash21(floor(input.world.xz * 23.0 + vec2f(4.3, -7.8)) + seed * 41.0);

  let dark_earth = vec3f(0.22, 0.125, 0.060);
  let loam = vec3f(0.39, 0.235, 0.112);
  let warm_crumb = vec3f(0.52, 0.325, 0.165);
  var base = mix(dark_earth, loam, 0.32 + coarse * 0.54);
  base = mix(base, warm_crumb, medium * 0.30);
  base *= 0.94 + grain * 0.16;

  let is_skirt = surface_type > 0.5 && surface_type < 1.5;
  let is_clod = surface_type > 1.5;
  let is_pebble = is_clod && seed > 0.91;
  if (is_skirt) {
    base *= 0.94;
    normal = normalize(mix(normal, vec3f(normal.x, normal.y * 0.65, normal.z), 0.16));
  }
  if (is_clod) {
    base *= mix(0.94, 1.08, seed);
  }
  if (is_pebble) {
    let stone = mix(vec3f(0.27, 0.26, 0.22), vec3f(0.51, 0.45, 0.35), mineral);
    base = mix(base, stone, 0.80);
  } else if (mineral > 0.972 && !is_skirt) {
    base = mix(base, vec3f(0.53, 0.43, 0.26), 0.22);
  }

  base = mix(base, base * vec3f(0.66, 0.69, 0.70), moisture * 0.34);

  let light_direction = normalize(uniforms.lightDirection.xyz);
  let view_direction = normalize(uniforms.cameraPosition.xyz - input.world);
  let half_direction = normalize(light_direction + view_direction);
  let n_dot_l = max(dot(normal, light_direction), 0.0);
  let n_dot_v = max(dot(normal, view_direction), 0.0);
  let n_dot_h = max(dot(normal, half_direction), 0.0);

  let dry_roughness = select(select(0.88, 0.78, is_clod), 0.62, is_pebble);
  let roughness = mix(dry_roughness, 0.50, moisture * 0.58);
  let specular_strength = mix(select(0.022, 0.055, is_pebble), 0.085, moisture * 0.72);
  let specular_power = mix(7.0, 44.0, pow(1.0 - roughness, 1.35));
  let fresnel = 0.04 + 0.96 * pow(1.0 - n_dot_v, 5.0);
  let specular = pow(n_dot_h, specular_power) * specular_strength * mix(0.55, 1.0, fresnel);

  let upward = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
  let wrapped = clamp((n_dot_l + 0.18) / 1.18, 0.0, 1.0);
  let ground_bounce = vec3f(0.20, 0.135, 0.085) * (1.0 - upward) * 0.16;
  let ambient = uniforms.ambientColor.rgb * (0.60 + upward * 0.28) + ground_bounce;
  let direct = uniforms.lightColor.rgb * uniforms.lightParams.x;
  let shadow = cloud_shadow(input.world);
  var color = base * (ambient + direct * (0.12 + wrapped * 0.76)) * shadow;
  color += direct * specular * shadow;

  if (is_clod && !is_pebble) {
    color *= 0.97 + wrapped * 0.07;
  }

  let rain = uniforms.lightParams.z;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.90, 0.96, 1.02), rain * 0.07);
  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  color = mix(color, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.62));
  return vec4f(color, 1.0);
}
