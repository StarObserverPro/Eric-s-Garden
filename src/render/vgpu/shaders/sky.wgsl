struct Uniforms {
  viewport: vec4f,
  skyTop: vec4f,
  skyHorizon: vec4f,
  sunColor: vec4f,
  sunDirection: vec4f,
  cameraForward: vec4f,
  cameraRight: vec4f,
  cameraUp: vec4f,
  scene: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(@builtin(vertex_index) vertex: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  return vec4f(positions[vertex], 1.0, 1.0);
}

fn hash12(value: vec2f) -> f32 {
  var p3 = fract(vec3f(value.x, value.y, value.x) * 0.1031);
  p3 += dot(p3, p3.yzx + vec3f(33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn cloud_field(coord: vec2f, time: f32) -> f32 {
  let first =
    sin(coord.x * 3.2 + time * 0.045) * 0.50 +
    sin(coord.y * 4.1 - time * 0.032) * 0.35;
  let second = sin((coord.x + coord.y) * 2.35 + time * 0.026) * 0.25;
  return smoothstep(0.18, 0.78, first + second + 0.45);
}

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let uv = position.xy / uniforms.viewport.xy;
  let screen = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let ray = normalize(
    uniforms.cameraForward.xyz +
    uniforms.cameraRight.xyz * (screen.x * uniforms.viewport.z * uniforms.viewport.w) +
    uniforms.cameraUp.xyz * (screen.y * uniforms.viewport.w)
  );

  let elevation = ray.y;
  var sky_mix = smoothstep(-0.08, 0.62, elevation);
  sky_mix = pow(sky_mix, 0.72);
  var color = mix(uniforms.skyHorizon.rgb, uniforms.skyTop.rgb, sky_mix);

  let mu = dot(ray, normalize(uniforms.sunDirection.xyz));
  let rayleigh_phase = 0.75 * (1.0 + mu * mu);
  let horizon_depth = exp(-max(elevation, -0.04) * 4.8);
  color += uniforms.skyTop.rgb * rayleigh_phase * 0.050 * (1.0 - horizon_depth * 0.24);

  let g = 0.78;
  let mie_phase = (1.0 - g * g) /
    pow(max(0.025, 1.0 + g * g - 2.0 * g * mu), 1.5);
  let solar_visibility = smoothstep(-0.045, 0.022, uniforms.sunDirection.y);
  let twilight_glow = exp(-abs(elevation - max(-0.02, uniforms.sunDirection.y)) * 12.0);
  let twilight_amount = clamp(1.0 - uniforms.sunDirection.y * 3.2, 0.0, 1.0);
  color += uniforms.sunColor.rgb * mie_phase * 0.009 * (0.28 + 0.72 * solar_visibility);
  color += uniforms.sunColor.rgb * twilight_glow * twilight_amount * 0.065;

  let sun_disc = smoothstep(0.99972, 0.99993, mu) * solar_visibility;
  let aureole = pow(max(mu, 0.0), 120.0) * solar_visibility;
  color += uniforms.sunColor.rgb * (sun_disc * 2.7 + aureole * 0.30) * uniforms.scene.w;

  let cloud_coord = vec2f(ray.x * 2.4 + ray.z * 1.2, elevation * 2.8 + ray.z * 0.35);
  let clouds = cloud_field(cloud_coord, uniforms.scene.x) * uniforms.scene.z;
  let cloud_height = smoothstep(-0.05, 0.56, elevation);
  let cloud_color = mix(uniforms.skyHorizon.rgb * 0.92, vec3f(0.97, 0.97, 0.91), sky_mix);
  color = mix(color, cloud_color, clouds * cloud_height * 0.34);

  let rain = uniforms.scene.y;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.83, 0.91, 1.02), rain * 0.20);
  color += (hash12(position.xy) - 0.5) / 255.0;
  return vec4f(color, 1.0);
}
