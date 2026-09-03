struct Uniforms {
  viewProjection: mat4x4f,
  scene: vec4f,
  weather: vec4f,
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

fn vegetation_root(index: u32, seed: f32) -> vec3f {
  let side = index % 4u;
  let along = hash11(f32(index) * 17.0 + 1.0) * 2.0 - 1.0;
  let depth = 0.25 + hash11(f32(index) * 23.0 + 5.0) * 1.2;
  if (side == 0u) {
    return vec3f(along * 4.55, -0.39, -3.3 - depth * 0.45);
  }
  if (side == 1u) {
    return vec3f(3.65 + depth * 0.55, -0.39, along * 3.05);
  }
  if (side == 2u) {
    return vec3f(along * 4.55, -0.39, 3.3 + depth * 0.45);
  }
  return vec3f(-3.65 - depth * 0.55, -0.39, along * 3.05);
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  let kind = u32(uniforms.weather.y + 0.5);
  let seed = hash11(f32(input.instance_index) * 29.0 + f32(kind) * 101.0 + 7.0);
  var world = vec3f(0.0);
  var normal = input.local_normal;
  var local = input.local_position;

  if (kind == 4u) {
    let flower = hash11(f32(input.instance_index) * 43.0 + 13.0) > 0.93;
    if (input.part > 0.5 && !flower) {
      local = vec3f(0.0, 1.0, 0.0);
    }
    let width = 0.72 + seed * 0.65;
    let height = 0.48 + hash11(seed * 37.0 + 11.0) * 0.62;
    local = vec3f(local.x * width, local.y * height, local.z * width);
    let root = vegetation_root(input.instance_index, seed);
    let phase = seed * 6.2831853 + root.x * 0.71 + root.z * 0.43;
    let wind = sin(uniforms.scene.x * (1.35 + seed * 0.75) + phase) * uniforms.scene.y;
    let bend = wind * local.y * local.y * 0.22;
    world = root + local + vec3f(bend, 0.0, bend * 0.37);
    normal = normalize(input.local_normal + vec3f(-bend * 0.18, 0.1, -bend * 0.07));
  } else {
    let placement = box_placement(kind, input.instance_index, seed);
    let transformed = rotate_y(input.local_position * placement.scale, placement.angle);
    world = placement.center + transformed;
    normal = normalize(rotate_y(input.local_normal, placement.angle));
  }

  var output: VertexOut;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.normal = normal;
  output.world = world;
  output.local = input.local_position;
  output.instance_data = vec4f(f32(kind), f32(input.instance_index), seed, input.part);
  return output;
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
  let cloudiness = uniforms.scene.z;
  let wave =
    sin(world.x * 0.48 + world.z * 0.19 + time * 0.08) +
    sin(world.z * 0.57 - world.x * 0.13 + time * 0.055) * 0.72;
  let mask = smoothstep(0.35, 1.35, wave);
  return 1.0 - cloudiness * mask * 0.26;
}

@fragment
fn fs_main(input: VertexOut) -> @location(0) vec4f {
  let kind = u32(input.instance_data.x + 0.5);
  let index = u32(input.instance_data.y + 0.5);
  let seed = input.instance_data.z;
  let part = input.instance_data.w;
  var base = vec3f(0.4, 0.55, 0.28);

  if (kind == 0u) {
    let grain = hash21(floor(input.world.xz * 7.0));
    base = mix(vec3f(0.33, 0.48, 0.22), vec3f(0.49, 0.61, 0.29), grain * 0.62);
  } else if (kind == 1u) {
    let grain = hash21(floor(input.world.xz * 20.0) + vec2f(f32(index), seed));
    let furrow = 0.5 + 0.5 * sin(input.local.z * 23.0 + input.local.x * 2.2);
    let wet = plot_wetness(index) * (0.76 + grain * 0.24);
    let dry_soil = mix(vec3f(0.34, 0.21, 0.13), vec3f(0.52, 0.34, 0.20), grain * 0.72);
    let wet_soil = mix(vec3f(0.12, 0.105, 0.085), vec3f(0.25, 0.17, 0.12), grain * 0.46);
    base = mix(dry_soil * (0.91 + furrow * 0.13), wet_soil, wet);
  } else if (kind == 2u) {
    let grain = hash21(floor(input.world.xz * 12.0) + seed);
    base = mix(vec3f(0.53, 0.50, 0.42), vec3f(0.75, 0.69, 0.56), grain);
  } else if (kind == 3u) {
    let grain = 0.5 + 0.5 * sin(input.world.y * 13.0 + seed * 17.0);
    base = mix(vec3f(0.31, 0.19, 0.095), vec3f(0.50, 0.31, 0.14), grain * 0.6);
  } else {
    if (part > 0.5) {
      base = select(vec3f(0.93, 0.55, 0.67), vec3f(0.95, 0.78, 0.25), seed > 0.5);
    } else {
      base = mix(vec3f(0.18, 0.42, 0.14), vec3f(0.39, 0.61, 0.24), seed);
    }
  }

  let light_direction = normalize(vec3f(-0.48, 0.86, -0.31));
  let normal = normalize(input.normal);
  let diffuse = select(max(dot(normal, light_direction), 0.0), abs(dot(normal, light_direction)), kind == 4u);
  let sunlight = uniforms.scene.w;
  let ambient = 0.34 + sunlight * 0.12;
  let shadow = cloud_shadow(input.world);
  var color = base * (ambient + diffuse * (0.43 + sunlight * 0.36)) * shadow;
  let luma = dot(color, vec3f(0.299, 0.587, 0.114));
  color = mix(color, vec3f(luma) * vec3f(0.92, 1.0, 1.05), uniforms.weather.x * 0.13);
  let distance_fog = smoothstep(9.0, 18.0, length(input.world.xz));
  color = mix(color, uniforms.weather.zww, distance_fog * 0.18);
  return vec4f(color, 1.0);
}
