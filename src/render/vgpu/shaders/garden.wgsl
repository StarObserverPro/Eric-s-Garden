struct Uniforms {
  viewProjection: mat4x4f,
  cameraPosition: vec4f,
  scene: vec4f,
  weather: vec4f,
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
  @location(0) local_position: vec3f,
  @location(1) local_normal: vec3f,
  @location(2) part: f32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) world: vec3f,
  @location(2) part: f32,
};

fn hash11(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
}

fn rotate_z(value: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(value.x * c - value.y * s, value.x * s + value.y * c, value.z);
}

fn plot_center(index: u32) -> vec3f {
  let column = f32(index % 4u) - 1.5;
  let row = f32(index / 4u) - 1.0;
  return vec3f(column * 1.65, -0.16, row * 1.75);
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  let active_plot = uniforms.weather.z;
  var world: vec3f;
  var normal: vec3f;

  if (active_plot < -0.5) {
    world = vec3f(0.0, -80.0, 0.0);
    normal = input.local_normal;
  } else {
    let plot_index = u32(active_plot + 0.5);
    let progress = clamp(uniforms.weather.w, 0.0, 1.0);
    let enter = smoothstep(0.0, 0.12, progress);
    let leave = smoothstep(0.84, 1.0, progress);
    let lift = (1.0 - enter + leave) * 0.32;
    let tilt = -0.27 * smoothstep(0.035, 0.20, progress) * (1.0 - leave * 0.45);
    let root = plot_center(plot_index) + vec3f(
      -0.66,
      0.54,
      (hash11(f32(plot_index) * 31.0 + 5.0) - 0.5) * 0.18,
    );
    let model_scale = 0.56;

    if (input.part > 1.5) {
      let pour = smoothstep(0.08, 0.18, progress) * (1.0 - smoothstep(0.82, 0.96, progress));
      if (pour < 0.02) {
        world = vec3f(0.0, -80.0, 0.0);
      } else {
        let ripple = sin(uniforms.scene.x * 18.0 + input.local_position.z * 140.0) * 0.004;
        world = root + vec3f(
          input.local_position.x * model_scale,
          input.local_position.y * model_scale + lift,
          input.local_position.z * model_scale + ripple,
        );
      }
      normal = input.local_normal;
    } else {
      let transformed = rotate_z(input.local_position * model_scale, tilt);
      world = root + transformed + vec3f(0.0, lift, 0.0);
      normal = normalize(rotate_z(input.local_normal, tilt));
    }
  }

  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.normal = normal;
  output.world = world;
  output.part = input.part;
  return output;
}

fn cloud_shadow(world: vec3f) -> f32 {
  let wave =
    sin(world.x * 0.48 + world.z * 0.19 + uniforms.scene.x * 0.08) +
    sin(world.z * 0.57 - world.x * 0.13 + uniforms.scene.x * 0.055) * 0.72;
  let mask = smoothstep(0.35, 1.35, wave);
  return 1.0 - uniforms.scene.z * mask * 0.26;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let part = input.part;
  var base: vec3f;
  if (part < 0.5) {
    base = vec3f(0.24, 0.42, 0.32);
  } else if (part < 1.5) {
    base = vec3f(0.66, 0.50, 0.27);
  } else {
    base = vec3f(0.26, 0.69, 0.86);
  }

  let normal = normalize(input.normal);
  let light_direction = normalize(uniforms.lightDirection.xyz);
  let n_dot_l = max(dot(normal, light_direction), 0.0);
  let upward = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
  let wrapped = clamp((n_dot_l + 0.24) / 1.24, 0.0, 1.0);
  let shadow = cloud_shadow(input.world);
  var color = base * (
    uniforms.ambientColor.rgb * (0.56 + upward * 0.30) +
    uniforms.lightColor.rgb * (0.18 + wrapped * 0.82) * uniforms.lightParams.x
  ) * shadow;

  let view_direction = normalize(uniforms.cameraPosition.xyz - input.world);
  let half_direction = normalize(light_direction + view_direction);
  let n_dot_h = max(dot(normal, half_direction), 0.0);
  var specular_strength = 0.055;
  var specular_power = 18.0;
  if (part > 0.5 && part < 1.5) {
    specular_strength = 0.22;
    specular_power = 34.0;
  } else if (part > 1.5) {
    specular_strength = 0.16;
    specular_power = 28.0;
  }
  color += uniforms.lightColor.rgb * pow(n_dot_h, specular_power) * specular_strength;

  let rain = uniforms.lightParams.z;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.88, 0.95, 1.03), rain * 0.10);
  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  color = mix(color, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.72));
  return vec4f(color, 1.0);
}
