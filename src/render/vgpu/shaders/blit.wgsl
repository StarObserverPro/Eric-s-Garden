struct Uniforms {
  resolution: vec2f,
  tone: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var scene_tex: texture_2d<f32>;
@group(0) @binding(2) var linear_samp: sampler;

fn scene_sample(uv: vec2f) -> vec3f {
  let safe_uv = clamp(uv, vec2f(0.0), vec2f(1.0));
  return textureSample(scene_tex, linear_samp, safe_uv).rgb;
}

fn luminance(color: vec3f) -> f32 {
  return dot(color, vec3f(0.299, 0.587, 0.114));
}

fn low_cost_edge_aa(uv: vec2f) -> vec3f {
  let pixel = vec2f(1.0) / max(uniforms.resolution, vec2f(1.0));
  let center = scene_sample(uv);
  let north = scene_sample(uv + vec2f(0.0, -pixel.y));
  let south = scene_sample(uv + vec2f(0.0, pixel.y));
  let west = scene_sample(uv + vec2f(-pixel.x, 0.0));
  let east = scene_sample(uv + vec2f(pixel.x, 0.0));

  let luma_center = luminance(center);
  let luma_north = luminance(north);
  let luma_south = luminance(south);
  let luma_west = luminance(west);
  let luma_east = luminance(east);
  let luma_min = min(luma_center, min(min(luma_north, luma_south), min(luma_west, luma_east)));
  let luma_max = max(luma_center, max(max(luma_north, luma_south), max(luma_west, luma_east)));
  let contrast = luma_max - luma_min;
  let threshold = max(0.035, luma_max * 0.09);

  if (contrast <= threshold) {
    return center;
  }

  let horizontal_gradient = abs(luma_west - luma_east);
  let vertical_gradient = abs(luma_north - luma_south);
  var neighbor_average = (north + south) * 0.5;
  if (horizontal_gradient > vertical_gradient) {
    neighbor_average = (west + east) * 0.5;
  }

  let blend = clamp((contrast - threshold) / max(contrast, 0.0001), 0.0, 1.0) * 0.42;
  return mix(center, neighbor_average, blend);
}

@fragment
fn fs_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
  let uv = position.xy / uniforms.resolution;
  var color = low_cost_edge_aa(uv) * uniforms.tone.x;
  let luma = luminance(color);
  let saturation = mix(1.04, 0.91, clamp(uniforms.tone.y, 0.0, 1.0));
  color = mix(vec3f(luma), color, saturation);
  color = (color - 0.5) * 1.025 + 0.5;
  let centered = uv * 2.0 - 1.0;
  let vignette = 1.0 - smoothstep(0.62, 1.38, dot(centered, centered)) * 0.055;
  return vec4f(clamp(color * vignette, vec3f(0.0), vec3f(1.0)), 1.0);
}
