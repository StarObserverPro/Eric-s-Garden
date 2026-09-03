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
  @builtin(instance_index) instance_index: u32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) world: vec3f,
  @location(2) local: vec3f,
  @location(3) instance_data: vec4f,
};

struct BoxPlacement {
  center: vec3f,
  scale: vec3f,
  angle: f32,
};

fn hash11(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
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

fn rotate_y(value: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(value.x * c - value.z * s, value.y, value.x * s + value.z * c);
}

fn plot_center(index: u32) -> vec3f {
  let column = f32(index % 4u) - 1.5;
  let row = f32(index / 4u) - 1.0;
  return vec3f(column * 1.65, -0.16, row * 1.75);
}

fn path_placement(index: u32, seed: f32) -> BoxPlacement {
  var center = vec3f(0.0, -0.34, 0.0);
  if (index < 18u) {
    let row = index / 2u;
    let side = index % 2u;
    center.x = select(-3.42, 3.42, side == 1u);
    center.z = -2.9 + f32(row) * 0.72;
  } else {
    let column = index - 18u;
    center.x = -3.15 + f32(column) * 0.7;
    center.z = 2.85;
  }
  return BoxPlacement(
    center,
    vec3f(0.28 + seed * 0.09, 0.055, 0.18 + hash11(seed * 41.0) * 0.07),
    (seed - 0.5) * 0.45,
  );
}

fn fence_placement(index: u32) -> BoxPlacement {
  if (index < 28u) {
    var center = vec3f(0.0, 0.2, 0.0);
    if (index < 16u) {
      let side = index / 8u;
      let step = index % 8u;
      center.x = -4.8 + f32(step) * (9.6 / 7.0);
      center.z = select(-3.55, 3.55, side == 1u);
    } else {
      let local = index - 16u;
      let side = local / 6u;
      let step = local % 6u;
      center.x = select(-4.8, 4.8, side == 1u);
      center.z = -3.55 + f32(step) * (7.1 / 5.0);
    }
    return BoxPlacement(center, vec3f(0.085, 0.62, 0.085), 0.0);
  }

  let rail = index - 28u;
  let side = rail / 2u;
  let high = rail % 2u;
  let height = select(0.02, 0.43, high == 1u);
  if (side < 2u) {
    let z = select(-3.55, 3.55, side == 1u);
    return BoxPlacement(vec3f(0.0, height, z), vec3f(4.8, 0.065, 0.065), 0.0);
  }
  let x = select(-4.8, 4.8, side == 3u);
  return BoxPlacement(vec3f(x, height, 0.0), vec3f(0.065, 0.065, 3.55), 0.0);
}

fn box_placement(kind: u32, index: u32, seed: f32) -> BoxPlacement {
  if (kind == 0u) {
    return BoxPlacement(vec3f(0.0, -0.65, 0.0), vec3f(5.7, 0.25, 4.3), 0.0);
  }
  if (kind == 1u) {
    return BoxPlacement(plot_center(index), vec3f(0.67, 0.13, 0.67), 0.0);
  }
  if (kind == 2u) {
    return path_placement(index, seed);
  }
  return fence_placement(index);
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  let kind = u32(uniforms.weather.y + 0.5);
  let seed = hash11(f32(input.instance_index) * 29.0 + f32(kind) * 101.0 + 7.0);
  let placement = box_placement(kind, input.instance_index, seed);
  let transformed = rotate_y(input.local_position * placement.scale, placement.angle);
  let world = placement.center + transformed;
  let normal = normalize(rotate_y(input.local_normal, placement.angle));

  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.normal = normal;
  output.world = world;
  output.local = input.local_position;
  output.instance_data = vec4f(f32(kind), f32(input.instance_index), seed, input.part);
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
  let kind = u32(input.instance_data.x + 0.5);
  let seed = input.instance_data.z;
  var base = vec3f(0.4, 0.55, 0.28);

  if (kind == 0u) {
    let mottling = value_noise(input.world.xz * 0.42);
    let fine = value_noise(input.world.xz * 1.35 + vec2f(7.1, -3.2));
    let turf = value_noise(input.world.xz * 4.6 + vec2f(-2.7, 9.4));
    let thatch = value_noise(vec2f(input.world.x * 8.2 + input.world.z * 0.8, input.world.z * 2.1));
    base = mix(vec3f(0.14, 0.30, 0.065), vec3f(0.36, 0.54, 0.15), 0.30 + 0.52 * mottling);
    base *= 0.74 + 0.17 * fine + 0.10 * turf;
    base += vec3f(0.07, 0.045, 0.012) * smoothstep(0.60, 0.90, thatch) * 0.55;
  } else if (kind == 2u) {
    let grain = hash21(floor(input.world.xz * 12.0) + seed);
    base = mix(vec3f(0.53, 0.50, 0.42), vec3f(0.75, 0.69, 0.56), grain);
  } else if (kind == 3u) {
    let grain = 0.5 + 0.5 * sin(input.world.y * 13.0 + seed * 17.0);
    base = mix(vec3f(0.31, 0.19, 0.095), vec3f(0.50, 0.31, 0.14), grain * 0.6);
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

  let rain = uniforms.lightParams.z;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.88, 0.95, 1.03), rain * 0.10);
  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  color = mix(color, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.72));
  return vec4f(color, 1.0);
}
