import type { GardenSceneSnapshot, ScenePlot, Vec3 } from "../../scene/snapshot";
import type { DprTier, GardenRenderer, RendererMetrics } from "../contract";
import { canvasProjection, footprint, type CanvasProjection, type GroundPoint, type Point } from "./canvas-projection";
import { cropArt, paintCrop } from "./cartoon-crops";

const GROUND = -.35;
const SOIL_TOP = .03;
interface Hit { readonly index: number; readonly paths: readonly Path2D[]; readonly x: number; readonly y: number; readonly scale: number }
interface GrassSeed { readonly x: number; readonly z: number; readonly height: number; readonly phase: number }
interface PaintItem { readonly depth: number; readonly draw: () => void }

export class Canvas2DRenderer implements GardenRenderer {
  readonly kind = "canvas2d" as const;
  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #maxDpr: DprTier;
  readonly #grass = createGrassSeeds(64);
  readonly #stones = createStonePositions();
  #snapshot: GardenSceneSnapshot | undefined;
  #width = 1;
  #height = 1;
  #dpr = 1;
  #hits: Hit[] = [];
  #instances = 0;
  #disposed = false;

  constructor(canvas: HTMLCanvasElement, maxDpr: DprTier) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.#canvas = canvas; this.#context = context; this.#maxDpr = maxDpr;
    this.resize();
  }

  setSnapshot(snapshot: GardenSceneSnapshot): void {
    this.#snapshot = snapshot;
    this.#hits = [];
  }

  resize(): void {
    if (this.#disposed) return;
    const rect = this.#canvas.getBoundingClientRect();
    this.#width = Math.max(1, rect.width || this.#canvas.clientWidth || 1);
    this.#height = Math.max(1, rect.height || this.#canvas.clientHeight || 1);
    this.#dpr = Math.min(window.devicePixelRatio || 1, this.#maxDpr);
    const width = Math.round(this.#width * this.#dpr), height = Math.round(this.#height * this.#dpr);
    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width; this.#canvas.height = height;
    }
    this.#context.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
    this.#hits = [];
  }

  render(timeMs: number): void {
    if (!this.#disposed && this.#snapshot) this.#draw(timeMs * .001, this.#snapshot);
  }

  pickPlot(x: number, y: number): number | null {
    if (this.#disposed || !Number.isFinite(x + y) || x < 0 || y < 0 || x > this.#width || y > this.#height) return null;
    const ctx = this.#context;
    ctx.save();
    // Hit paths use CSS/local coordinates. Do not accidentally apply DPR twice.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
      for (let i = this.#hits.length - 1; i >= 0; i -= 1) {
        const hit = this.#hits[i]!;
        if (hit.paths.some(path => ctx.isPointInPath(path, (x - hit.x) / hit.scale, (y - hit.y) / hit.scale))) return hit.index;
      }
    } finally { ctx.restore(); }
    return null;
  }

  metrics(): RendererMetrics {
    return { kind: this.kind, passes: 1, drawCalls: 1, instances: this.#instances, resources: 1, dpr: this.#dpr };
  }

  dispose(): void { this.#disposed = true; this.#hits = []; this.#snapshot = undefined; }

  #draw(time: number, snapshot: GardenSceneSnapshot): void {
    const ctx = this.#context, view = canvasProjection(this.#width, this.#height, snapshot.camera);
    this.#hits = [];
    ctx.clearRect(0, 0, this.#width, this.#height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const sky = ctx.createLinearGradient(0, 0, 0, this.#height);
    sky.addColorStop(0, rgb(snapshot.weather.skyTop));
    sky.addColorStop(1, rgb(snapshot.weather.skyHorizon));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, this.#width, this.#height);
    this.#clouds(time, snapshot.weather.cloudiness);

    const island = footprint(0, 0, 5.05, 3.85, .48);
    this.#solid(view, island, -.76, GROUND, "#a1b974", "#77934f", "#647d48", "#648049");
    // Broad meadow patches live on the ground plane; no floating screen ellipse.
    this.#groundOval(view, -.8, .4, 3.9, 2.6, GROUND + .005, "rgba(203,215,143,.36)");
    if (snapshot.weather.cloudiness > .1) {
      this.#groundOval(view, Math.sin(time * .07) * 2, Math.cos(time * .06), 2.5, 1.2,
        GROUND + .006, `rgba(62,84,59,${snapshot.weather.cloudiness * .085})`);
    }

    // One view-depth queue for all grounded objects. Never assign permanent
    // 'front fence' roles to world edges; those roles reverse on rotation.
    const items: PaintItem[] = [];
    const enqueue = (x: number, z: number, draw: () => void) => items.push({ depth: view.depth(x, z), draw });
    this.#stones.forEach(([x, , z], index) => enqueue(x, z, () => {
      const radius = .16 + hash(index * 11 + 2) * .08;
      const points = Array.from({ length: 8 }, (_, i) => {
        const angle = i / 8 * Math.PI * 2 + hash(index + 9) * .5;
        return { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius * .76 };
      });
      this.#solid(view, points, GROUND, GROUND + .07, "#d8cfae", "#aea486", "#a0957b", "#89846a");
    }));
    this.#grass.forEach(blade => enqueue(blade.x, blade.z, () => this.#grassClump(view, blade, time, snapshot.weather.wind)));
    this.#fence(view, enqueue);
    snapshot.plots.forEach(plot => enqueue(plot.position[0], plot.position[2], () => this.#plot(view, plot)));
    items.sort((a, b) => a.depth - b.depth);
    for (const item of items) item.draw();
    this.#instances = items.length;
    if (snapshot.weather.rain > 0) this.#rain(time, snapshot.weather.rain);
  }

  #plot(view: CanvasProjection, plot: ScenePlot): void {
    const [x, , z] = plot.position;
    const wet = Math.max(0, Math.min(1, plot.wetness));
    const soil = footprint(x, z, .62, .62, .075);
    this.#groundOval(view, x + .045, z + .06, .77, .69, GROUND, "rgba(58,65,38,.16)");
    const bedFaces: Path2D[] = [];
    const surface = this.#solid(view, soil, GROUND, SOIL_TOP,
      blend("#ba8758", "#79553e", wet), blend("#97623f", "#5c402f", wet),
      blend("#a97148", "#664833", wet), "#695039", bedFaces);
    const ctx = this.#context;
    ctx.save(); ctx.clip(surface);
    // Wide, filled soil bands: a world-aligned cue, not a fine ruled grid.
    for (const offset of [-.36, 0, .36]) {
      const band = footprint(x, z + offset, .51, .065, .045);
      this.#polygon(band.map(p => view.point(p.x, p.z, SOIL_TOP)), blend("#a77448", "#674631", wet));
    }
    if (view.scale >= 34) for (let grain = 0; grain < 7; grain += 1) {
      const gx = x + (hash(plot.index * 71 + grain * 13) - .5) * .9;
      const gz = z + (hash(plot.index * 43 + grain * 19) - .5) * .94;
      this.#groundOval(view, gx, gz, .04 + hash(grain + 7) * .018, .032, SOIL_TOP + .002,
        grain % 2 ? "rgba(232,181,115,.38)" : "rgba(71,48,31,.25)");
    }
    if (wet > 0) this.#groundOval(view, x - .18, z + .34, .25, .08, SOIL_TOP + .003, `rgba(190,200,161,${wet * .19})`);
    ctx.restore();
    this.#hits.push({ index: plot.index, paths: bedFaces, x: 0, y: 0, scale: 1 });
    if (!plot.crop || plot.harvested || plot.stage < 1) return;
    const root = view.point(x, z, SOIL_TOP);
    this.#groundOval(view, x + .055, z + .025, .37, .24, SOIL_TOP + .004, "rgba(49,59,31,.23)");
    const art = cropArt(plot.crop, plot.stage);
    paintCrop(ctx, art, root.x, root.y, view.scale);
    this.#hits.push({ index: plot.index, paths: art.hit, x: root.x, y: root.y, scale: view.scale });
    if (plot.pest) this.#badge(root, view.scale, plot.index, "pest");
    else if (plot.stage >= 4) this.#badge(root, view.scale, plot.index, "ripe");
  }

  #badge(root: Point, scale: number, index: number, kind: "pest" | "ripe"): void {
    const ctx = this.#context;
    const radius = Math.max(6.5, scale * .105);
    const x = root.x + scale * .45, y = root.y - scale * .13;
    const hit = new Path2D(); hit.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = kind === "pest" ? "#ffedba" : "#e7b945"; ctx.fill(hit);
    ctx.strokeStyle = "#79603a"; ctx.lineWidth = 2; ctx.stroke(hit);
    if (kind === "pest") {
      ctx.fillStyle = "#567947";
      for (const part of [-.36, 0, .36]) {
        ctx.beginPath(); ctx.arc(x + radius * part, y, radius * .34, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#fff5d7"; ctx.beginPath(); ctx.arc(x + radius * .46, y - radius * .13, radius * .12, 0, Math.PI * 2); ctx.fill();
    } else {
      const star = new Path2D();
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4, r = radius * (i % 2 ? .23 : .68);
        const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
        if (i) star.lineTo(px, py); else star.moveTo(px, py);
      }
      star.closePath(); ctx.fillStyle = "#fff3bd"; ctx.fill(star);
    }
    this.#hits.push({ index, paths: [hit], x: 0, y: 0, scale: 1 });
  }

  #fence(view: CanvasProjection, enqueue: (x: number, z: number, draw: () => void) => void): void {
    const sides = [
      [-4.8, -3.55, 4.8, -3.55, 8], [4.8, -3.55, 4.8, 3.55, 6],
      [4.8, 3.55, -4.8, 3.55, 8], [-4.8, 3.55, -4.8, -3.55, 6],
    ] as const;
    for (const [ax, az, bx, bz, count] of sides) {
      for (let i = 0; i < count; i += 1) {
        const x = ax + (bx - ax) * i / count, z = az + (bz - az) * i / count;
        enqueue(x, z, () => this.#solid(view, footprint(x, z, .09, .09, .02), GROUND, GROUND + .88,
          "#e5c88b", "#ad8050", "#bd945f", "#725d3e"));
        const nx = ax + (bx - ax) * (i + 1) / count, nz = az + (bz - az) * (i + 1) / count;
        const mx = (x + nx) * .5, mz = (z + nz) * .5;
        enqueue(mx, mz, () => {
          const rail = footprint(mx, mz, Math.abs(nx - x) * .5 + .025, Math.abs(nz - z) * .5 + .025);
          for (const h of [.3, .62]) this.#solid(view, rail, GROUND + h, GROUND + h + .11,
            "#d8b676", "#b18a55", "#c29b61", "#826940");
        });
      }
    }
  }

  #solid(view: CanvasProjection, points: readonly GroundPoint[], bottom: number, top: number,
    topFill: string, sideA: string, sideB: string, outline: string, hitFaces?: Path2D[]): Path2D {
    const upper = points.map(p => view.point(p.x, p.z, top));
    const lower = points.map(p => view.point(p.x, p.z, bottom));
    const faces = points.map((a, i) => ({ a, b: points[(i + 1) % points.length]!, i }))
      .filter(({ a, b }) => view.facesViewer(a, b))
      .sort((a, b) => view.depth(a.a.x + a.b.x, a.a.z + a.b.z) - view.depth(b.a.x + b.b.x, b.a.z + b.b.z));
    for (const { a, b, i } of faces) {
      const n = (i + 1) % points.length;
      const face = this.#polygon([upper[i]!, upper[n]!, lower[n]!, lower[i]!], Math.abs(b.x - a.x) > Math.abs(b.z - a.z) ? sideA : sideB, outline);
      hitFaces?.push(face);
    }
    const surface = this.#polygon(upper, topFill, outline);
    hitFaces?.push(surface);
    return surface;
  }

  #groundOval(view: CanvasProjection, x: number, z: number, rx: number, rz: number, y: number, fill: string): void {
    this.#polygon(Array.from({ length: 16 }, (_, i) => {
      const angle = i / 16 * Math.PI * 2;
      return view.point(x + Math.cos(angle) * rx, z + Math.sin(angle) * rz, y);
    }), fill);
  }

  #grassClump(view: CanvasProjection, blade: GrassSeed, time: number, wind: number): void {
    const ctx = this.#context, root = view.point(blade.x, blade.z, GROUND);
    const height = blade.height * view.scale;
    const sway = Math.sin(time * 1.7 + blade.phase * 6.3) * wind * view.scale * .055;
    for (const direction of [-1, 0, 1]) {
      const tipX = root.x + direction * height * .43 + sway, tipY = root.y - height * (direction ? .7 : 1);
      const width = height * .21;
      ctx.beginPath(); ctx.moveTo(root.x - width * .4, root.y);
      ctx.quadraticCurveTo(root.x - width + direction * height * .2, root.y - height * .6, tipX, tipY);
      ctx.quadraticCurveTo(root.x + width + direction * height * .2, root.y - height * .4, root.x + width * .4, root.y);
      ctx.closePath(); ctx.fillStyle = direction < 0 ? "#5a8146" : direction ? "#72994e" : "#88ab58"; ctx.fill();
    }
    if (blade.phase > .86) {
      const tip = { x: root.x + sway, y: root.y - height };
      ctx.fillStyle = blade.phase > .94 ? "#efc167" : "#e9adad";
      const r = Math.max(2.2, view.scale * .045);
      for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        ctx.beginPath(); ctx.arc(tip.x + dx! * r, tip.y + dy! * r, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#fff0bf"; ctx.beginPath(); ctx.arc(tip.x, tip.y, r * .7, 0, Math.PI * 2); ctx.fill();
    }
  }

  #clouds(time: number, cloudiness: number): void {
    const ctx = this.#context;
    ctx.save(); ctx.globalAlpha = .32 + cloudiness * .34; ctx.fillStyle = "#f8efdb";
    for (let i = 0; i < 4; i += 1) {
      const x = ((i * (this.#width + 240) / 4 + time * 6) % (this.#width + 240)) - 120;
      const y = this.#height * (.11 + (i % 2) * .075);
      ctx.beginPath(); ctx.ellipse(x, y, 61, 15, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 21, y - 10, 29, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 19, y - 8, 25, 17, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  #rain(time: number, rain: number): void {
    const ctx = this.#context;
    ctx.fillStyle = `rgba(226,241,237,${.3 + rain * .22})`;
    for (let i = 0; i < Math.round(22 + rain * 20); i += 1) {
      const x = hash(i * 31 + 9) * this.#width;
      const y = ((hash(i * 47 + 2) + time * (.4 + rain * .35)) % 1) * this.#height;
      // Filled rounded drops replace one-pixel scratches across the garden.
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 2.4, y + 7, x - 1, y + 11);
      ctx.quadraticCurveTo(x - 5, y + 13, x - 4, y + 8); ctx.closePath(); ctx.fill();
    }
  }

  #polygon(points: readonly Point[], fill: string, stroke?: string): Path2D {
    const path = new Path2D();
    points.forEach((point, i) => { if (i) path.lineTo(point.x, point.y); else path.moveTo(point.x, point.y); });
    path.closePath();
    const ctx = this.#context; ctx.fillStyle = fill; ctx.fill(path);
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(path); }
    return path;
  }
}

function createGrassSeeds(count: number): GrassSeed[] {
  return Array.from({ length: count }, (_, i) => {
    const along = hash(i * 17 + 1) * 2 - 1, depth = .12 + hash(i * 23 + 5) * .25;
    const side = i % 4;
    return {
      x: side === 0 || side === 2 ? along * 4.55 : (side === 1 ? 1 : -1) * (4.15 + depth),
      z: side === 1 || side === 3 ? along * 3.2 : (side === 0 ? -1 : 1) * (3.1 + depth),
      height: .22 + hash(i * 29 + 7) * .24, phase: hash(i * 37 + 11),
    };
  });
}
function createStonePositions(): Vec3[] {
  const positions: Vec3[] = [];
  for (let row = 0; row < 9; row += 1) {
    const z = -2.9 + row * .72; positions.push([-3.5, GROUND, z], [3.5, GROUND, z]);
  }
  for (let col = 0; col < 10; col += 1) positions.push([-3.15 + col * .7, GROUND, 2.85]);
  return positions;
}
function hash(value: number): number { const sine = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return sine - Math.floor(sine); }
function rgb(color: Vec3): string { return `rgb(${color.map(component => Math.round(component * 255)).join(",")})`; }
function blend(a: string, b: string, amount: number): string {
  return `rgb(${[1,3,5].map(offset => Math.round(parseInt(a.slice(offset, offset + 2), 16) * (1 - amount) + parseInt(b.slice(offset, offset + 2), 16) * amount)).join(",")})`;
}
