struct Uniforms {
  resolution: vec2f,
  skyTop: vec4f,
  skyHorizon: vec4f,
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

fn cloud_field(uv: vec2f, time: f32) -> f32 {
  let p = uv * vec2f(5.4, 3.0);
  let first = sin(p.x + time * 0.045) * 0.5 + sin(p.y * 1.7 - time * 0.032) * 0.35;
  let second = sin((p.x + p.y) * 1.35 + time * 0.026) * 0.25;
  return smoothstep(0.18, 0.78, first + second + 0.45);
}

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let uv = position.xy / uniforms.resolution;
  let height = 1.0 - uv.y;
  let gradient = smoothstep(0.0, 0.92, height);
  var color = mix(uniforms.skyHorizon.rgb, uniforms.skyTop.rgb, gradient);

  let sun_position = vec2f(0.73, 0.23);
  let sun_distance = distance(uv, sun_position);
  let sun = exp(-sun_distance * sun_distance * 145.0) * uniforms.scene.w;
  color += vec3f(1.0, 0.78, 0.38) * sun * 0.72;

  let clouds = cloud_field(uv + vec2f(0.0, height * 0.08), uniforms.scene.x) * uniforms.scene.z;
  let cloud_color = mix(vec3f(0.78, 0.80, 0.77), vec3f(0.98, 0.98, 0.91), height);
  color = mix(color, cloud_color, clouds * 0.34 * smoothstep(0.04, 0.56, height));

  let rain = uniforms.scene.y;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.85, 0.93, 1.0), rain * 0.22);
  return vec4f(color, 1.0);
}
