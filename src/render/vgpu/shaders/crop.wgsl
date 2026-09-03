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
};

fn hash11(value: f32) -> f32 {
  return fract(sin(value * 12.9898 + 78.233) * 43758.5453);
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

  // Pumpkin baseline vines were technically present but too thin and too close to soil to read.
  // Inflate/lift only the low stem carrier so the main vine remains continuous without moving its root.
  if (is_pumpkin && is_stem) {
    let ground_factor = 1.0 - smoothstep(0.10, 0.24, max(local.y, 0.0));
    local += input.local_normal * (0.011 * whole_scale * organ_growth * ground_factor);
    local.y += 0.026 * whole_scale * ground_factor;
  }

  // Keep pumpkin foliage out of the primary fruit occupancy pocket near the home root.
  // This is a presentation constraint only; root/gameplay coordinates remain authoritative.
  if (is_pumpkin && is_foliage) {
    let fruit_center = vec2f(0.22, 0.12) * whole_scale;
    let fruit_offset = local.xz - fruit_center;
    let fruit_distance = max(length(fruit_offset), 0.001);
    let clearance =
      (1.0 - smoothstep(0.16 * whole_scale, 0.34 * whole_scale, fruit_distance)) *
      (1.0 - smoothstep(0.24, 0.42, local.y));
    let clearance_direction = fruit_offset / fruit_distance;
    local.x += clearance_direction.x * clearance * 0.060 * whole_scale;
    local.z += clearance_direction.y * clearance * 0.060 * whole_scale;
    local.y += clearance * 0.050 * whole_scale;
  }

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
  output.stage = stage_norm;
  output.visible_flag = 1.0;
  return output;
}

fn foliage_color(crop: f32, variation: f32) -> vec3f {
  var color = vec3f(0.16, 0.40, 0.09);
  if (crop < 0.5) {
    color = vec3f(0.13, 0.38, 0.09);
  } else if (crop < 1.5) {
    color = vec3f(0.09, 0.32, 0.065);
  } else if (crop < 2.5) {
    color = vec3f(0.19, 0.43, 0.10);
  } else if (crop < 3.5) {
    color = vec3f(0.14, 0.38, 0.075);
  } else if (crop < 4.5) {
    color = vec3f(0.31, 0.56, 0.14);
  } else {
    color = vec3f(0.15, 0.39, 0.09);
  }
  return color * (0.84 + variation * 0.27);
}

fn harvest_color(crop: f32, stage: f32, variation: f32) -> vec3f {
  var color = vec3f(0.86, 0.46, 0.08);
  if (crop < 0.5) {
    color = vec3f(0.95, 0.39, 0.055);
  } else if (crop < 1.5) {
    let ripe = smoothstep(0.54, 0.96, stage);
    color = mix(vec3f(0.34, 0.52, 0.10), vec3f(0.96, 0.13, 0.045), ripe);
  } else if (crop < 2.5) {
    let ripe = smoothstep(0.68, 0.98, stage);
    color = mix(vec3f(0.45, 0.59, 0.11), vec3f(0.94, 0.68, 0.13), ripe);
  } else if (crop < 3.5) {
    color = mix(vec3f(0.46, 0.58, 0.10), vec3f(0.97, 0.34, 0.035), smoothstep(0.58, 0.94, stage));
  } else if (crop > 4.5) {
    color = mix(vec3f(0.55, 0.62, 0.12), vec3f(0.93, 0.045, 0.045), smoothstep(0.57, 0.96, stage));
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
  var roughness = 0.72;
  var backlight_strength = 0.32;
  var ambient_strength = 0.58;
  var direct_floor = 0.055;

  if (is_stem) {
    albedo = foliage_color(crop, variation) * vec3f(0.68, 0.76, 0.60);
    roughness = 0.78;
    backlight_strength = 0.10;
    ambient_strength = 0.54;
    if ((crop > 2.5) && (crop < 3.5)) {
      albedo = vec3f(0.27, 0.44, 0.075) * (0.90 + variation * 0.16);
      roughness = 0.64;
      direct_floor = 0.075;
    }
  } else if (is_harvest) {
    albedo = harvest_color(crop, input.stage, variation);
    roughness = 0.58;
    if (crop < 0.5) {
      roughness = 0.60;
    } else if (crop < 1.5) {
      roughness = 0.34;
    } else if (crop < 2.5) {
      roughness = 0.68;
    } else if (crop < 3.5) {
      roughness = 0.50;
    } else if (crop > 4.5) {
      roughness = 0.39;
    }
    backlight_strength = 0.04;
    ambient_strength = 0.48;
    direct_floor = 0.075;
  } else if (is_blossom) {
    albedo = select(vec3f(0.96, 0.83, 0.50), vec3f(0.96, 0.91, 0.73), crop > 4.5);
    roughness = 0.76;
    backlight_strength = 0.38;
    ambient_strength = 0.60;
  } else if (is_husk) {
    albedo = mix(foliage_color(crop, variation), vec3f(0.78, 0.67, 0.18), 0.28);
    roughness = 0.78;
    backlight_strength = 0.22;
    ambient_strength = 0.56;
  }

  let interpolated_normal = normalize(input.normal);
  let sided_normal = select(-interpolated_normal, interpolated_normal, front_facing);
  var face_normal = normalize(cross(dpdx(input.world), dpdy(input.world)));
  if (!front_facing) {
    face_normal = -face_normal;
  }

  // Foliage keeps some smooth bend while exposing ribbon/facet changes to the light.
  // Harvest surfaces lean much harder on geometric face normals for readable low-poly volume.
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
  let transmission = pow(max(dot(-normal, light_direction), 0.0), 1.35);
  let shadow = cloud_shadow(input.world);
  let base_occlusion = 0.70 + 0.30 * smoothstep(-0.02, 0.46, input.world.y);

  var color = albedo * base_occlusion * (
    uniforms.ambientColor.rgb * ambient_strength * (0.72 + hemisphere * 0.28) +
    uniforms.lightColor.rgb * (direct_floor + wrapped_diffuse * 0.99) * uniforms.lightParams.x
  ) * shadow;

  color += albedo * uniforms.lightColor.rgb * back_lighting * backlight_strength * uniforms.lightParams.x * shadow;
  if (is_foliage || is_husk) {
    color += albedo * uniforms.lightColor.rgb * transmission * backlight_strength * 0.20 * uniforms.lightParams.x * shadow;
  }

  if (is_harvest) {
    let spec_power = mix(14.0, 68.0, 1.0 - roughness);
    let fresnel = 0.04 + 0.96 * pow(1.0 - n_dot_v, 5.0);
    let specular = pow(n_dot_h, spec_power);
    let specular_strength = (0.035 + (1.0 - roughness) * 0.20) * mix(0.58, 1.0, fresnel);
    color += uniforms.lightColor.rgb * specular * specular_strength * uniforms.lightParams.x * shadow;

    // Mild per-face tone separation prevents round fruit from collapsing into one flat color patch.
    let facet_tone = 0.94 + 0.08 * clamp(face_normal.y * 0.5 + 0.5, 0.0, 1.0);
    color *= facet_tone;
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
