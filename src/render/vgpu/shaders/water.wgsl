struct Uniforms {
  viewProjection: mat4x4f,
  cameraPosition: vec4f,
  scene: vec4f,
  lightDirection: vec4f,
  lightColor: vec4f,
  ambientColor: vec4f,
  fogColor: vec4f,
  lightParams: vec4f,
  skyColor: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexIn {
  @location(0) world_position: vec3f,
  @location(1) water_depth: f32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) water_depth: f32,
};

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  let wind = clamp(uniforms.scene.y, 0.0, 1.0);
  let direction_a = normalize(vec2f(-0.78, 0.63));
  let direction_b = normalize(vec2f(0.42, 0.91));
  let phase_a = dot(input.world_position.xz, direction_a) * 1.18
    - uniforms.scene.x * (0.52 + wind * 0.58);
  let phase_b = dot(input.world_position.xz, direction_b) * 2.05
    + uniforms.scene.x * (0.31 + wind * 0.47);
  let amplitude_a = 0.008 + wind * 0.013;
  let amplitude_b = 0.004 + wind * 0.008;

  let wave_a = sin(phase_a) * amplitude_a;
  let wave_b = sin(phase_b) * amplitude_b;
  let slope_a = cos(phase_a) * amplitude_a * 1.18;
  let slope_b = cos(phase_b) * amplitude_b * 2.05;
  let gradient = direction_a * slope_a + direction_b * slope_b;

  var world = input.world_position;
  world.y += wave_a + wave_b;

  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.world = world;
  output.normal = normalize(vec3f(-gradient.x, 1.0, -gradient.y));
  output.water_depth = input.water_depth;
  return output;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let normal = normalize(input.normal);
  let light_direction = normalize(uniforms.lightDirection.xyz);
  let view_direction = normalize(uniforms.cameraPosition.xyz - input.world);
  let rain = clamp(uniforms.lightParams.z, 0.0, 1.0);
  let cloudiness = clamp(uniforms.scene.z, 0.0, 1.0);
  let sunlight = clamp(uniforms.scene.w, 0.0, 1.0);
  let wind = clamp(uniforms.scene.y, 0.0, 1.0);

  let depth_mix = smoothstep(0.025, 0.34, input.water_depth);
  let shallow = vec3f(0.18, 0.29, 0.20);
  let deep = vec3f(0.055, 0.145, 0.17);
  var body = mix(shallow, deep, depth_mix);

  let n_dot_v = max(dot(normal, view_direction), 0.0);
  let fresnel = pow(1.0 - n_dot_v, 2.7);
  let sky_mix = 0.20 + fresnel * 0.57;
  let sky = mix(uniforms.skyColor.rgb, uniforms.fogColor.rgb, 0.24 + cloudiness * 0.22);
  body = mix(body, sky, sky_mix);

  let reflected = reflect(-light_direction, normal);
  let sun_specular = pow(max(dot(reflected, view_direction), 0.0), mix(82.0, 54.0, wind));
  let sun_strength = uniforms.lightParams.x * sunlight * (1.0 - cloudiness * 0.58);
  body += uniforms.lightColor.rgb * sun_specular * sun_strength * 0.62;

  let cold_rain = vec3f(0.055, 0.11, 0.135);
  body = mix(body, cold_rain, rain * 0.34);
  body *= 1.0 - cloudiness * 0.08 - rain * 0.10;

  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  body = mix(body, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.82));

  // Intentionally opaque/depth-writing. This keeps the P1 water inexpensive
  // and avoids a scene-color copy, refraction target, sorting, or extra pass.
  return vec4f(body, 1.0);
}
