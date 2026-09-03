struct Uniforms {
  resolution: vec2f,
  tone: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var scene_tex: texture_2d<f32>;
@group(0) @binding(2) var linear_samp: sampler;

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let uv = position.xy / uniforms.resolution;
  var color = textureSample(scene_tex, linear_samp, uv).rgb * uniforms.tone.x;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  let saturation = mix(1.04, 0.91, clamp(uniforms.tone.y, 0.0, 1.0));
  color = mix(vec3f(luma), color, saturation);
  color = (color - 0.5) * 1.025 + 0.5;
  let centered = uv * 2.0 - 1.0;
  let vignette = 1.0 - smoothstep(0.62, 1.38, dot(centered, centered)) * 0.055;
  return vec4f(clamp(color * vignette, vec3f(0.0), vec3f(1.0)), 1.0);
}
