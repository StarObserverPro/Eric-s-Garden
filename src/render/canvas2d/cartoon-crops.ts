import type { CropId } from "../../game/model";

interface Shape { readonly path: Path2D; readonly fill: string; readonly outline: boolean }
export interface CropArt { readonly shapes: readonly Shape[]; readonly hit: readonly Path2D[] }
const INK = "#344c35";
const LEAF = "#669b4b";
const LIGHT = "#a9c969";
const DARK = "#417544";
const cache = new Map<string, CropArt>();

/** Small cached vector cut-outs; local (0,0) is the soil contact, never the
 * center of an emoji glyph. Coordinates are world-scaled screen-facing art.
 * No font, network asset, extra game state or frame loop is involved. */
export function cropArt(crop: CropId, stage: number): CropArt {
  const phase = Math.max(1, Math.min(4, Math.floor(stage)));
  const key = `${crop}:${phase}`;
  const previous = cache.get(key);
  if (previous) return previous;
  const shapes: Shape[] = [];
  const hit: Path2D[] = [];
  const add = (path: Path2D, fill: string, outline = true) => {
    shapes.push({ path, fill, outline });
    hit.push(path);
  };
  const path = (d: string, fill: string, outline = true) => add(new Path2D(d), fill, outline);
  const oval = (x: number, y: number, rx: number, ry: number, fill: string, rotation = 0, outline = true) => {
    const p = new Path2D(); p.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); add(p, fill, outline);
  };
  const leaf = (x: number, y: number, tx: number, ty: number, width: number, fill = LEAF) => {
    const dx = tx - x, dy = ty - y, length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * width, ny = dx / length * width;
    path(`M${x} ${y} C${x + dx * .25 + nx} ${y + dy * .25 + ny} ${tx + nx * .65} ${ty + ny * .65} ${tx} ${ty} C${tx - nx * .4} ${ty - ny * .4} ${x + dx * .3 - nx * .5} ${y + dy * .3 - ny * .5} ${x} ${y}Z`, fill);
  };
  const stem = (height: number, width = .06) => path(`M${-width} 0 L${-width * .6} ${-height} Q0 ${-height - .04} ${width * .6} ${-height} L${width} 0Z`, DARK);
  const crown = (x: number, y: number, size: number) => {
    leaf(x, y, x - size, y - size * .38, size * .33, DARK);
    leaf(x, y, x + size, y - size * .38, size * .33, LEAF);
    leaf(x, y, x + .02, y - size * .7, size * .3, LIGHT);
  };

  if (phase === 1) {
    stem(.3, .04);
    leaf(0, -.16, -.26, -.36, .13);
    leaf(0, -.2, .25, -.43, .14, LIGHT);
  } else if (phase === 2) {
    const tall = crop === "corn" || crop === "tomato";
    stem(tall ? .68 : .4, .045);
    leaf(0, -.12, -.38, -.34, .14);
    leaf(0, -.2, .35, -.51, .15, LIGHT);
    leaf(0, -.38, tall ? -.24 : -.13, tall ? -.74 : -.66, .14);
    if (tall) leaf(0, -.46, .25, -.8, .12, LIGHT);
  } else if (crop === "carrot") {
    // Orange shoulder emerges from the bed; the buried root is not a floating icon.
    oval(0, -.13, .22, .2, phase === 4 ? "#ee963b" : "#d4b25c");
    path("M-.19 -.13 Q0 -.22 .18 -.1 L.12 .01 Q0 .06 -.14 .01Z", "#ce762d", false);
    path("M-.03 -.22 C-.18 -.29 -.16 -.43 -.22 -.44 C-.42 -.39 -.43 -.55 -.28 -.57 C-.47 -.62 -.4 -.76 -.24 -.71 C-.4 -.88 -.27 -.98 -.16 -.8 C-.1 -.91 .01 -.85 -.05 -.7 C.07 -.71 .1 -.58 -.05 -.52 L.04 -.24Z", DARK);
    path("M.01 -.23 L.09 -.56 C-.02 -.66 .05 -.76 .15 -.69 C.1 -.9 .22 -.94 .25 -.74 C.38 -.82 .45 -.7 .3 -.61 C.49 -.63 .48 -.48 .31 -.49 C.39 -.37 .27 -.3 .19 -.36 L.08 -.22Z", LEAF);
    leaf(0, -.28, .02, -.97, .1, LIGHT);
    path("M-.13 -.17 Q-.06 -.21 .02 -.17 L0 -.13 L-.12 -.12Z", "#ffc463", false);
  } else if (crop === "tomato") {
    stem(.86);
    leaf(0, -.5, -.39, -.85, .17);
    leaf(.01, -.68, .36, -.99, .15, LIGHT);
    leaf(0, -.84, -.06, -1.12, .13);
    for (const [x,y,r] of [[-.2,-.42,.25],[.19,-.23,.27],[.2,-.67,.2]]) {
      oval(x!, y!, r!, r! * .9, phase === 4 ? "#df6246" : "#9aba5c");
      oval(x! - r! * .25, y! - r! * .26, r! * .36, r! * .19, phase === 4 ? "#f59d68" : "#c3d681", -.45, false);
      crown(x!, y! - r! * .8, r! * .6);
    }
  } else if (crop === "corn") {
    stem(1.16, .05);
    leaf(0, -.17, -.4, -.58, .14, DARK);
    leaf(.01, -.38, .4, -.79, .14);
    leaf(0, -.72, -.29, -1.06, .12, LIGHT);
    // The ear is wrapped by two substantial husks, not a naked yellow oval.
    oval(.08, -.61, .19, .34, phase === 4 ? "#efc754" : "#b6c66b", .08);
    for (const row of [0,1,2,3]) for (const column of [-1,0,1]) {
      oval(.08 + column * .085, -.83 + row * .13, .035, .046, phase === 4 ? "#ffe48a" : "#d9df9b", 0, false);
    }
    leaf(.08, -.27, -.17, -.81, .15, DARK);
    leaf(.1, -.28, .31, -.91, .13, LEAF);
    path("M-.03 -1.08 L-.11 -1.22 L-.07 -1.25 L.01 -1.15 L.07 -1.27 L.12 -1.23 L.06 -1.07Z", "#cda65c");
  } else if (crop === "pumpkin") {
    leaf(-.03, -.06, -.57, -.27, .24, DARK);
    leaf(.05, -.07, .5, -.48, .23);
    path("M-.06 -.35 Q-.15 -.62 .04 -.62 L.12 -.58 Q.01 -.55 .08 -.35Z", "#6b8544");
    oval(0, -.22, .43, .29, phase === 4 ? "#d88133" : "#91ab59");
    oval(-.13, -.23, .18, .27, phase === 4 ? "#ed9e43" : "#a7bb67", .06);
    oval(.14, -.23, .18, .27, phase === 4 ? "#e6993e" : "#9ab55e", -.06);
    oval(0, -.23, .16, .29, phase === 4 ? "#f4b24f" : "#bbca76");
    oval(-.045, -.36, .045, .1, phase === 4 ? "#ffd181" : "#d6dea0", .25, false);
  } else if (crop === "lettuce") {
    for (const [x,y,rx,ry,rotation] of [[-.29,-.2,.25,.22,-.4],[.28,-.22,.25,.23,.4],[-.15,-.4,.22,.27,-.3],[.16,-.43,.24,.26,.3]]) {
      oval(x!, y!, rx!, ry!, DARK, rotation!);
    }
    leaf(-.09, .015, -.44, -.38, .25, LEAF);
    leaf(.08, .015, .45, -.4, .25, LEAF);
    oval(0, -.3, .28, .29, phase === 4 ? "#b2cd73" : "#8fb25c");
    path("M-.14 -.23 Q-.23 -.46 .02 -.49 Q.24 -.43 .13 -.19 Q.01 -.36 -.05 -.2Z", "#d0df98", false);
    path("M-.16 -.1 Q.03 .01 .22 -.16 Q.11 -.02 0 .02 Q-.12 .01 -.16 -.1Z", "#5d9346", false);
  } else {
    leaf(-.03, -.04, -.48, -.36, .22, DARK);
    leaf(.02, -.14, -.18, -.67, .21);
    leaf(.04, -.13, .4, -.63, .22, LIGHT);
    for (const [x,y,size] of [[-.18,-.2,.23],[.24,-.14,.26]]) {
      const xx=x!, yy=y!, s=size!;
      path(`M${xx-s} ${yy-s*.42} Q${xx-s*1.1} ${yy-s*1.05} ${xx} ${yy-s*.9} Q${xx+s*1.1} ${yy-s*1.05} ${xx+s} ${yy-s*.35} Q${xx+s*.6} ${yy+s*.5} ${xx} ${yy+s*.65} Q${xx-s*.65} ${yy+s*.36} ${xx-s} ${yy-s*.42}Z`, phase === 4 ? "#d95750" : "#dab179");
      for (const [sx,sy] of [[-.35,-.42],[.34,-.38],[0,.02]]) oval(xx+sx!*s, yy+sy!*s, s*.075, s*.11, "#ffe4a0", .1, false);
      crown(xx, yy-s*.85, s*.65);
    }
  }
  const result = { shapes, hit };
  cache.set(key, result);
  return result;
}

export function paintCrop(ctx: CanvasRenderingContext2D, art: CropArt, x: number, y: number, scale: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(.026, 2 / scale);
  ctx.strokeStyle = INK;
  for (const shape of art.shapes) {
    ctx.fillStyle = shape.fill;
    ctx.fill(shape.path);
    if (shape.outline) ctx.stroke(shape.path);
  }
  ctx.restore();
}
