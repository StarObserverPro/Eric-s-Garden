struct Uniforms {
  viewProjection: mat4x4f,
  cameraPosition: vec4f,
  scene: vec4f,
  lightDirection: vec4f,
  lightColor: vec4f,
  ambientColor: vec4f,
  fogColor: vec4f,
  lightParams: vec4f,
  crop0: vec4f,
  crop1: vec4f,
  crop2: vec4f,
  stage0: vec4f,
  stage1: vec4f,
  stage2: vec4f,
  rootX0: vec4f,
  rootX1: vec4f,
  rootX2: vec4f,
  rootY0: vec4f,
  rootY1: vec4f,
  rootY2: vec4f,
  rootZ0: vec4f,
  rootZ1: vec4f,
  rootZ2: vec4f,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexIn {
  @location(0) local_position: vec3f,
  @location(1) local_normal: vec3f,
  @location(2) anchor: vec3f,
  @location(3) crop_kind: f32,
  @location(4) material_kind: f32,
  @location(5) birth: f32,
  @location(6) flex: f32,
  @builtin(instance_index) instance_index: u32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) normal: vec3f,
  @location(1) world: vec3f,
  @location(2) crop_material: vec2f,
  @location(3) stage: f32,
  @location(4) variation: f32,
  @location(5) visible_flag: f32,
  @location(6) local_surface: vec3f,
};

fn hash11(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
}

fn hash21(value: vec2f) -> f32 {
  return fract(sin(dot(value, vec2f(127.1, 311.7))) * 43758.5453);
}

fn component4(value: vec4f, lane: u32) -> f32 {
  if (lane == 0u) { return value.x; }
  if (lane == 1u) { return value.y; }
  if (lane == 2u) { return value.z; }
  return value.w;
}

fn plot_value(a: vec4f, b: vec4f, c: vec4f, index: u32) -> f32 {
  let group = index / 4u;
  let lane = index % 4u;
  if (group == 0u) { return component4(a, lane); }
  if (group == 1u) { return component4(b, lane); }
  return component4(c, lane);
}

fn rotate_xz(value: vec3f, basis_x: vec2f, basis_z: vec2f) -> vec3f {
  let rotated = basis_x * value.x + basis_z * value.z;
  return vec3f(rotated.x, value.y, rotated.y);
}

fn orientation_basis(instance_index: u32, crop_kind: f32, root: vec3f) -> mat2x2f {
  if (abs(crop_kind - 3.0) < 0.25) {
    let length_value = max(length(root.xz), 0.001);
    let outward = root.xz / length_value;
    let side = vec2f(-outward.y, outward.x);
    return mat2x2f(outward, side);
  }
  let angle = (hash11(f32(instance_index) * 41.0 + 17.0) - 0.5) * 0.38;
  let c = cos(angle);
  let s = sin(angle);
  return mat2x2f(vec2f(c, s), vec2f(-s, c));
}

fn cloud_shadow(world: vec3f) -> f32 {
  let wave =
    sin(world.x * 0.48 + world.z * 0.19 + uniforms.scene.x * 0.08) +
    sin(world.z * 0.57 - world.x * 0.13 + uniforms.scene.x * 0.055) * 0.72;
  let mask = smoothstep(0.35, 1.35, wave);
  return 1.0 - uniforms.scene.z * mask * 0.24;
}

@vertex
fn vs_main(input: VertexIn) -> VertexOut {
  let crop_kind = plot_value(uniforms.crop0, uniforms.crop1, uniforms.crop2, input.instance_index);
  let visual_stage = plot_value(uniforms.stage0, uniforms.stage1, uniforms.stage2, input.instance_index);
  let root = vec3f(
    plot_value(uniforms.rootX0, uniforms.rootX1, uniforms.rootX2, input.instance_index),
    plot_value(uniforms.rootY0, uniforms.rootY1, uniforms.rootY2, input.instance_index),
    plot_value(uniforms.rootZ0, uniforms.rootZ1, uniforms.rootZ2, input.instance_index)
  );

  var output: VertexOut;
  output.crop_material = vec2f(input.crop_kind, input.material_kind);
  output.stage = 0.0;
  output.variation = hash11(f32(input.instance_index) * 53.0 + input.birth * 97.0 + input.material_kind * 11.0);
  output.normal = vec3f(0.0, 1.0, 0.0);
  output.world = root;
  output.local_surface = vec3f(0.0);
  output.visible_flag = 0.0;

  if ((visual_stage < 0.5) || (abs(input.crop_kind - crop_kind) > 0.25)) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  let stage_norm = clamp((visual_stage - 1.0) / 3.0, 0.0, 1.0);
  let whole_scale = 0.40 + stage_norm * 0.60;
  let organ_growth = clamp((stage_norm - input.birth + 0.18) / 0.18, 0.0, 1.0);
  if (organ_growth <= 0.001) {
    output.position = vec4f(2.0, 2.0, 2.0, 1.0);
    return output;
  }

  var local = input.anchor * whole_scale + (input.local_position - input.anchor) * whole_scale * organ_growth;
  let is_pumpkin = abs(crop_kind - 3.0) < 0.25;
  let is_stem = (input.material_kind > 0.5) && (input.material_kind < 1.5);
  let is_foliage = input.material_kind < 0.5;
  let is_harvest = (input.material_kind > 1.5) && (input.material_kind < 2.5);

  local.y -= 0.018 * whole_scale;

  if (is_pumpkin && is_stem) {
    let ground_factor = 1.0 - smoothstep(0.10, 0.24, max(local.y, 0.0));
    local += input.local_normal * (0.016 * whole_scale * organ_growth * ground_factor);
    local.y += 0.035 * whole_scale * ground_factor;
  }

  if (is_pumpkin && is_foliage) {
    let fruit_center = vec2f(0.33, 0.14) * whole_scale;
    let fruit_offset = local.xz - fruit_center;
    let fruit_distance = max(length(fruit_offset), 0.001);
    let clearance =
      (1.0 - smoothstep(0.18 * whole_scale, 0.38 * whole_scale, fruit_distance)) *
      (1.0 - smoothstep(0.24, 0.42, local.y));
    let clearance_direction = fruit_offset / fruit_distance;
    local.x += clearance_direction.x * clearance * 0.090 * whole_scale;
    local.z += clearance_direction.y * clearance * 0.090 * whole_scale;
    local.y += clearance * 0.065 * whole_scale;
  }

  if ((crop_kind > 4.5) && is_harvest) {
    let berry_anchor = input.anchor.xz * whole_scale;
    let drop = clamp((input.anchor.y * whole_scale - local.y) / max(0.12 * whole_scale, 0.001), 0.0, 1.0);
    let radial = local.xz - berry_anchor;
    let tapered_xz = berry_anchor + radial * mix(1.02, 0.48, pow(drop, 1.35));
    local.x = tapered_xz.x;
    local.z = tapered_xz.y;
  }

  // High-flex foliage is the actual tomato compound leaf; low-flex foliage is fruit calyx/sepal geometry.
  // Broaden only the compound leaf around its real stem-node anchor, preserving every truss attachment.
  if ((crop_kind > 0.5) && (crop_kind < 1.5) && is_foliage) {
    let compound_leaf = smoothstep(0.54, 0.70, input.flex);
    let scaled_anchor = input.anchor * whole_scale;
    let expanded = scaled_anchor + (local - scaled_anchor) * mix(1.0, 1.30, compound_leaf);
    local = vec3f(expanded.x, mix(local.y, expanded.y, 0.42), expanded.z);
  }

  if ((crop_kind > 3.5) && (crop_kind < 4.5) && is_foliage) {
    let base_radius = length(input.anchor.xz);
    let leaf_seed = hash21(input.anchor.xz * 173.0 + vec2f(base_radius * 91.0, 7.0));
    let yaw_jitter = (leaf_seed - 0.5) * 0.80;
    let c = cos(yaw_jitter);
    let s = sin(yaw_jitter);
    let rotated_xz = vec2f(local.x * c - local.z * s, local.x * s + local.z * c);
    let radial_scale = 0.86 + leaf_seed * 0.28;
    local.x = rotated_xz.x * radial_scale;
    local.z = rotated_xz.y * radial_scale;

    let anchor_xz = input.anchor.xz * whole_scale;
    let rotated_anchor = vec2f(anchor_xz.x * c - anchor_xz.y * s, anchor_xz.x * s + anchor_xz.y * c) * radial_scale;
    let axis_length = max(length(rotated_anchor), 0.001);
    let leaf_axis = rotated_anchor / axis_length;
    let leaf_side = vec2f(-leaf_axis.y, leaf_axis.x);
    let relative = local.xz - rotated_anchor;
    let along = max(dot(relative, leaf_axis), 0.0);
    let across = dot(relative, leaf_side);

    let outer_leaf = smoothstep(0.058, 0.070, base_radius);
    let inner_leaf = 1.0 - smoothstep(0.034, 0.050, base_radius);
    var nominal_length = mix(0.255, 0.330, outer_leaf);
    nominal_length = mix(nominal_length, 0.175, inner_leaf);
    let blade_t = clamp(along / max(nominal_length * whole_scale * 0.84, 0.001), 0.0, 1.0);
    let blunt_tip = smoothstep(0.78, 1.0, blade_t);
    let widened_across = across * (1.0 + blunt_tip * (2.15 + leaf_seed * 0.75));
    let shortened_along = along * (1.0 - blunt_tip * 0.065);
    let reshaped_xz = rotated_anchor + leaf_axis * shortened_along + leaf_side * widened_across;
    local.x = reshaped_xz.x;
    local.z = reshaped_xz.y;

    let body = smoothstep(0.22, 0.82, blade_t);
    let curled_xz = rotated_anchor + (local.xz - rotated_anchor) * (1.0 - inner_leaf * body * (0.15 + leaf_seed * 0.07));
    local.x = curled_xz.x;
    local.z = curled_xz.y;
    local.y += inner_leaf * body * (0.034 + leaf_seed * 0.016) * whole_scale;
  }

  if ((crop_kind > 1.5) && (crop_kind < 2.5) && is_foliage) {
    let upper_leaf = smoothstep(1.05, 1.48, input.anchor.y);
    let scaled_anchor = input.anchor.xz * whole_scale;
    let shortened_xz = scaled_anchor + (local.xz - scaled_anchor) * (1.0 - upper_leaf * 0.34);
    local.x = shortened_xz.x;
    local.z = shortened_xz.y;
  }

  let material_local = local;
  let basis = orientation_basis(input.instance_index, crop_kind, root);
  let basis_x = basis[0];
  let basis_z = basis[1];
  local = rotate_xz(local, basis_x, basis_z);
  var normal = normalize(rotate_xz(input.local_normal, basis_x, basis_z));

  let wind_phase = uniforms.scene.x * (1.15 + uniforms.scene.y * 0.22) + root.x * 1.37 - root.z * 0.91;
  let height_load = smoothstep(0.04, 1.20, max(local.y, 0.0));
  let gust = sin(wind_phase) * 0.68 + sin(wind_phase * 0.47 + 1.8) * 0.32;
  let wind_amount = gust * uniforms.scene.y * input.flex * height_load * 0.048;
  local.x += wind_amount * -0.84;
  local.z += wind_amount * 0.54;
  normal = normalize(vec3f(normal.x - wind_amount * 0.18, normal.y, normal.z + wind_amount * 0.11));

  let world = root + local;
  output.position = uniforms.viewProjection * vec4f(world, 1.0);
  output.normal = normal;
  output.world = world;
  output.local_surface = material_local;
  output.stage = stage_norm;
  output.visible_flag = 1.0;
  return output;
}

fn foliage_color(crop: f32, variation: f32) -> vec3f {
  var color = vec3f(0.20, 0.49, 0.11);
  if (crop < 0.5) {
    color = vec3f(0.17, 0.48, 0.115);
  } else if (crop < 1.5) {
    color = vec3f(0.235, 0.53, 0.14);
  } else if (crop < 2.5) {
    color = vec3f(0.24, 0.52, 0.12);
  } else if (crop < 3.5) {
    color = vec3f(0.19, 0.49, 0.10);
  } else if (crop < 4.5) {
    color = vec3f(0.31, 0.57, 0.16);
  } else {
    color = vec3f(0.19, 0.49, 0.11);
  }
  return color * (0.90 + variation * 0.24);
}

fn foliage_roughness(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.68; }
  if (crop < 1.5) { return 0.82; }
  if (crop < 2.5) { return 0.52; }
  if (crop < 3.5) { return 0.86; }
  if (crop < 4.5) { return 0.66; }
  return 0.56;
}

fn foliage_transmission(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.64; }
  if (crop < 1.5) { return 0.44; }
  if (crop < 2.5) { return 0.46; }
  if (crop < 3.5) { return 0.34; }
  if (crop < 4.5) { return 0.52; }
  return 0.50;
}

fn foliage_specular_scale(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.52; }
  if (crop < 1.5) { return 0.30; }
  if (crop < 2.5) { return 0.88; }
  if (crop < 3.5) { return 0.24; }
  if (crop < 4.5) { return 0.60; }
  return 0.82;
}

fn foliage_ambient(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.72; }
  if (crop < 1.5) { return 0.92; }
  if (crop < 2.5) { return 0.69; }
  if (crop < 3.5) { return 0.74; }
  if (crop < 4.5) { return 0.70; }
  return 0.77;
}

fn stem_roughness(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.76; }
  if (crop < 1.5) { return 0.84; }
  if (crop < 2.5) { return 0.62; }
  if (crop < 3.5) { return 0.74; }
  if (crop < 4.5) { return 0.78; }
  return 0.70;
}

fn harvest_roughness(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.70; }
  if (crop < 1.5) { return 0.26; }
  if (crop < 2.5) { return 0.46; }
  if (crop < 3.5) { return 0.58; }
  if (crop > 4.5) { return 0.36; }
  return 0.62;
}

fn harvest_scatter(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.025; }
  if (crop < 1.5) { return 0.085; }
  if (crop < 2.5) { return 0.035; }
  if (crop < 3.5) { return 0.055; }
  if (crop > 4.5) { return 0.125; }
  return 0.030;
}

fn harvest_f0(crop: f32) -> f32 {
  if (crop < 0.5) { return 0.030; }
  if (crop < 1.5) { return 0.045; }
  if (crop < 2.5) { return 0.040; }
  if (crop < 3.5) { return 0.036; }
  if (crop > 4.5) { return 0.042; }
  return 0.035;
}

fn harvest_color(crop: f32, stage: f32, variation: f32) -> vec3f {
  var color = vec3f(0.86, 0.46, 0.08);
  if (crop < 0.5) {
    color = vec3f(0.95, 0.39, 0.055);
  } else if (crop < 1.5) {
    let ripe = smoothstep(0.54, 0.96, stage);
    color = mix(vec3f(0.34, 0.52, 0.10), vec3f(0.88, 0.11, 0.040), ripe);
  } else if (crop < 2.5) {
    let ripe = smoothstep(0.68, 0.98, stage);
    color = mix(vec3f(0.45, 0.59, 0.11), vec3f(0.94, 0.68, 0.13), ripe);
  } else if (crop < 3.5) {
    color = mix(vec3f(0.46, 0.58, 0.10), vec3f(0.97, 0.34, 0.035), smoothstep(0.58, 0.94, stage));
  } else if (crop > 4.5) {
    color = mix(vec3f(0.55, 0.62, 0.12), vec3f(0.96, 0.060, 0.048), smoothstep(0.57, 0.96, stage));
  }
  return color * (0.93 + variation * 0.12);
}

@fragment
fn fs_main(input: VertexOut, @builtin(front_facing) front_facing: bool) -> @location(0) vec4f {
  if (input.visible_flag < 0.5) {
    discard;
  }

  let crop = input.crop_material.x;
  let material = input.crop_material.y;
  let variation = input.variation;
  let is_foliage = material < 0.5;
  let is_stem = (material > 0.5) && (material < 1.5);
  let is_harvest = (material > 1.5) && (material < 2.5);
  let is_blossom = (material > 2.5) && (material < 3.5);
  let is_husk = material > 3.5;

  var albedo = foliage_color(crop, variation);
  var roughness = foliage_roughness(crop);
  var backlight_strength = foliage_transmission(crop);
  var ambient_strength = foliage_ambient(crop);
  var direct_floor = 0.080;
  var surface_specular_scale = foliage_specular_scale(crop);

  if (is_foliage && (crop > 0.5) && (crop < 1.5)) {
    direct_floor = 0.094;
  }

  if (is_stem) {
    albedo = foliage_color(crop, variation) * vec3f(0.68, 0.76, 0.60);
    roughness = stem_roughness(crop);
    backlight_strength = 0.08;
    ambient_strength = 0.62;
    surface_specular_scale = select(0.36, 0.62, (crop > 1.5) && (crop < 2.5));
    if ((crop > 0.5) && (crop < 1.5)) {
      albedo = foliage_color(crop, variation) * vec3f(0.78, 0.86, 0.70);
      ambient_strength = 0.69;
      direct_floor = 0.088;
    }
    if ((crop > 2.5) && (crop < 3.5)) {
      albedo = vec3f(0.34, 0.54, 0.10) * (0.92 + variation * 0.15);
      ambient_strength = 0.67;
      direct_floor = 0.096;
    }
  } else if (is_harvest) {
    albedo = harvest_color(crop, input.stage, variation);
    roughness = harvest_roughness(crop);
    backlight_strength = harvest_scatter(crop);
    ambient_strength = 0.58;
    if ((crop > 0.5) && (crop < 1.5)) { ambient_strength = 0.62; }
    if ((crop > 2.5) && (crop < 3.5)) { ambient_strength = 0.60; }
    if (crop > 4.5) { ambient_strength = 0.72; }
    direct_floor = 0.090;
    surface_specular_scale = 1.0;
  } else if (is_blossom) {
    albedo = select(vec3f(0.91, 0.74, 0.36), vec3f(0.96, 0.91, 0.73), crop > 4.5);
    roughness = 0.78;
    backlight_strength = 0.36;
    ambient_strength = 0.62;
    surface_specular_scale = 0.18;
  } else if (is_husk) {
    albedo = mix(foliage_color(crop, variation), vec3f(0.70, 0.64, 0.22), 0.16);
    roughness = 0.86;
    backlight_strength = 0.24;
    ambient_strength = 0.67;
    surface_specular_scale = 0.20;
  }

  let surface_noise = hash21(floor(input.world.xz * 22.0 + vec2f(input.world.y * 11.0, variation * 29.0)));
  if (is_foliage || is_husk) {
    let leaf_wave = 0.5 + 0.5 * sin(
      input.world.x * 18.0 + input.world.z * 15.0 + input.world.y * 13.0 + variation * 6.2831853
    );
    let pigment_variation = select(0.12, 0.07, (crop > 0.5) && (crop < 1.5));
    albedo *= 1.0 - pigment_variation * 0.5 + leaf_wave * pigment_variation;
  } else if (is_stem) {
    albedo *= 0.96 + surface_noise * 0.07;
  } else if (is_harvest) {
    var noise_amount = 0.06;
    if ((crop > 0.5) && (crop < 1.5)) { noise_amount = 0.025; }
    if (crop > 4.5) { noise_amount = 0.040; }
    if ((crop > 2.5) && (crop < 3.5)) { noise_amount = 0.075; }
    if (crop < 0.5) { noise_amount = 0.090; }
    albedo *= 1.0 - noise_amount * 0.5 + surface_noise * noise_amount;
    roughness = clamp(roughness + (surface_noise - 0.5) * noise_amount * 0.90, 0.22, 0.90);
  }

  if (is_foliage && (crop > 3.5) && (crop < 4.5)) {
    let crown_radius = length(input.local_surface.xz);
    let inner_head = (1.0 - smoothstep(0.10, 0.27, crown_radius)) * smoothstep(0.05, 0.23, input.local_surface.y);
    albedo = mix(albedo, vec3f(0.43, 0.60, 0.21), inner_head * 0.15);
    backlight_strength += inner_head * 0.025;
  }

  if (is_harvest && (crop < 0.5)) {
    let shoulder = smoothstep(0.015, 0.105, input.local_surface.y);
    albedo *= mix(vec3f(0.86, 0.78, 0.68), vec3f(1.05, 1.01, 0.94), shoulder);
  }

  let interpolated_normal = normalize(input.normal);
  let sided_normal = select(-interpolated_normal, interpolated_normal, front_facing);
  var face_normal = normalize(cross(dpdx(input.world), dpdy(input.world)));
  if (!front_facing) {
    face_normal = -face_normal;
  }
  if (!front_facing && (is_foliage || is_husk)) {
    albedo *= vec3f(0.94, 1.02, 0.91);
    roughness = min(0.94, roughness + 0.07);
    backlight_strength *= 1.12;
  }
  if (is_foliage || is_husk) {
    let facet_value = clamp(face_normal.y * 0.5 + 0.5, 0.0, 1.0);
    albedo *= 0.96 + facet_value * 0.08;
  }

  var normal = sided_normal;
  if (is_harvest) {
    normal = normalize(mix(sided_normal, face_normal, 0.72));
  } else if (is_foliage || is_husk) {
    normal = normalize(mix(sided_normal, face_normal, 0.38));
  } else {
    normal = normalize(mix(sided_normal, face_normal, 0.20));
  }

  let light_direction = normalize(uniforms.lightDirection.xyz);
  let view_direction = normalize(uniforms.cameraPosition.xyz - input.world);
  let half_direction = normalize(light_direction + view_direction);
  let n_dot_l = max(dot(normal, light_direction), 0.0);
  let n_dot_v = max(dot(normal, view_direction), 0.0);
  let n_dot_h = max(dot(normal, half_direction), 0.0);
  let wrapped_diffuse = clamp((n_dot_l + 0.10) / 1.10, 0.0, 1.0);
  let hemisphere = clamp(normal.y * 0.5 + 0.5, 0.0, 1.0);
  let back_lighting = pow(max(dot(view_direction, -light_direction), 0.0), 4.0);
  let transmission = pow(max(dot(-normal, light_direction), 0.0), 1.28);
  let shadow = cloud_shadow(input.world);
  var base_occlusion = 0.74 + 0.26 * smoothstep(-0.02, 0.46, input.world.y);
  if (is_foliage || is_husk) {
    base_occlusion = 0.82 + 0.18 * smoothstep(-0.02, 0.40, input.world.y);
  }

  var color = albedo * base_occlusion * (
    uniforms.ambientColor.rgb * ambient_strength * (0.72 + hemisphere * 0.28) +
    uniforms.lightColor.rgb * (direct_floor + wrapped_diffuse * 0.99) * uniforms.lightParams.x
  ) * shadow;

  color += albedo * uniforms.lightColor.rgb * back_lighting * backlight_strength * 0.82 * uniforms.lightParams.x * shadow;
  if (is_foliage || is_husk) {
    color += albedo * uniforms.lightColor.rgb * transmission * backlight_strength * 0.34 * uniforms.lightParams.x * shadow;
    let leaf_spec_power = mix(12.0, 52.0, 1.0 - roughness);
    let leaf_fresnel = 0.025 + 0.075 * pow(1.0 - n_dot_v, 5.0);
    let leaf_specular = pow(n_dot_h, leaf_spec_power) * (0.012 + (1.0 - roughness) * 0.065) * surface_specular_scale;
    color += uniforms.lightColor.rgb * leaf_specular * (0.72 + leaf_fresnel) * uniforms.lightParams.x * shadow;
    if ((crop > 0.5) && (crop < 1.5)) {
      let velvet = pow(1.0 - n_dot_v, 2.0) * 0.055;
      color += albedo * uniforms.ambientColor.rgb * velvet;
    }
  }

  if (is_stem) {
    let stem_spec_power = mix(10.0, 34.0, 1.0 - roughness);
    let stem_specular = pow(n_dot_h, stem_spec_power) * (0.008 + (1.0 - roughness) * 0.030) * surface_specular_scale;
    color += uniforms.lightColor.rgb * stem_specular * uniforms.lightParams.x * shadow;
  }

  if (is_harvest) {
    let spec_power = mix(12.0, 86.0, 1.0 - roughness);
    let f0 = harvest_f0(crop);
    let fresnel = f0 + (1.0 - f0) * pow(1.0 - n_dot_v, 5.0);
    let specular = pow(n_dot_h, spec_power);
    let specular_strength = (0.035 + (1.0 - roughness) * 0.23) * mix(0.46, 1.0, fresnel);
    color += uniforms.lightColor.rgb * specular * specular_strength * uniforms.lightParams.x * shadow;

    let fruit_scatter = pow(max(dot(-normal, light_direction), 0.0), 1.6) * backlight_strength;
    color += albedo * uniforms.lightColor.rgb * fruit_scatter * 0.22 * uniforms.lightParams.x * shadow;

    let facet_tone = 0.94 + 0.08 * clamp(face_normal.y * 0.5 + 0.5, 0.0, 1.0);
    color *= facet_tone;

    if ((crop > 2.5) && (crop < 3.5)) {
      let whole_scale = 0.40 + input.stage * 0.60;
      let fruit_center = vec2f(0.33, 0.14) * whole_scale;
      let fruit_offset = input.local_surface.xz - fruit_center;
      let fruit_length = max(length(fruit_offset), 0.001);
      let fruit_direction = fruit_offset / fruit_length;
      let angle = atan2(fruit_direction.y, fruit_direction.x);
      let rib = 0.5 + 0.5 * cos(angle * 8.0);
      color *= 0.95 + pow(rib, 2.0) * 0.10;
    }
  }

  let rain = uniforms.lightParams.z;
  color *= 1.0 - rain * 0.035;
  if (is_harvest) {
    color += uniforms.lightColor.rgb * rain * 0.025;
  }

  let distance_to_camera = length(input.world - uniforms.cameraPosition.xyz);
  let fog_amount = 1.0 - exp(-pow(distance_to_camera * uniforms.lightParams.y, 2.0));
  color = mix(color, uniforms.fogColor.rgb, clamp(fog_amount, 0.0, 0.82));
  return vec4f(color, 1.0);
}
