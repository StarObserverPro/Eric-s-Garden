import { CROPS } from "../../game/model";
import type { GardenSceneSnapshot, Vec3 } from "../../scene/snapshot";
import type { DprTier, GardenRenderer, RendererMetrics } from "../contract";

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Hit {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

interface GrassSeed {
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly phase: number;
  readonly flower: number;
}

export class Canvas2DRenderer implements GardenRenderer {
  readonly kind = "canvas2d" as const;

  readonly #canvas: HTMLCanvasElement;
  readonly #context: CanvasRenderingContext2D;
  readonly #maxDpr: DprTier;
  readonly #grass = createGrassSeeds(112);
  #snapshot: GardenSceneSnapshot | undefined;
  #width = 1;
  #height = 1;
  #dpr = 1;
  #hits: Hit[] = [];
  #disposed = false;

  constructor(canvas: HTMLCanvasElement, maxDpr: DprTier) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable.");
    this.#canvas = canvas;
    this.#context = context;
    this.#maxDpr = maxDpr;
    this.resize();
  }

  setSnapshot(snapshot: GardenSceneSnapshot): void {
    this.#snapshot = snapshot;
  }

  resize(): void {
    if (this.#disposed) return;
    const rect = this.#canvas.getBoundingClientRect();
    this.#width = Math.max(1, rect.width || this.#canvas.clientWidth || 1);
    this.#height = Math.max(1, rect.height || this.#canvas.clientHeight || 1);
    this.#dpr = Math.min(window.devicePixelRatio || 1, this.#maxDpr);
    const width = Math.round(this.#width * this.#dpr);
    const height = Math.round(this.#height * this.#dpr);
    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }
    this.#context.setTransform(this.#dpr, 0, 0, this.#dpr, 0, 0);
  }

  render(timeMs: number): void {
    if (this.#disposed || !this.#snapshot) return;
    this.#draw(timeMs * 0.001, this.#snapshot);
  }

  pickPlot(x: number, y: number): number | null {
    let closest: Hit | undefined;
    let distance = Number.POSITIVE_INFINITY;
    for (const hit of this.#hits) {
      const next = Math.hypot(x - hit.x, y - hit.y);
      if (next < hit.radius && next < distance) {
        closest = hit;
        distance = next;
      }
    }
    return closest?.index ?? null;
  }

  metrics(): RendererMetrics {
    return {
      kind: this.kind,
      passes: 1,
      drawCalls: 1,
      instances: this.#grass.length,
      resources: 1,
      dpr: this.#dpr,
    };
  }

  dispose(): void {
    this.#disposed = true;
    this.#hits = [];
  }

  #draw(time: number, snapshot: GardenSceneSnapshot): void {
    const ctx = this.#context;
    const weather = snapshot.weather;
    this.#hits = [];
    ctx.clearRect(0, 0, this.#width, this.#height);

    const sky = ctx.createLinearGradient(0, 0, 0, this.#height * 0.67);
    sky.addColorStop(0, rgb(weather.skyTop));
    sky.addColorStop(1, rgb(weather.skyHorizon));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.#width, this.#height);
    this.#drawClouds(ctx, time, weather.cloudiness);

    const ground = [
      this.#project(-5.6, -4.3, -0.44, snapshot),
      this.#project(5.6, -4.3, -0.44, snapshot),
      this.#project(5.6, 4.3, -0.44, snapshot),
      this.#project(-5.6, 4.3, -0.44, snapshot),
    ];
    this.#polygon(ground, "#7d9c55", "rgba(55,76,40,.38)");

    this.#drawCloudShadow(ctx, time, weather.cloudiness, snapshot);
    this.#drawBackFence(ctx, snapshot);
    this.#drawStones(ctx, snapshot);
    this.#drawGrass(ctx, time, snapshot);

    const sortedPlots = [...snapshot.plots].sort(
      (a, b) =>
        this.#project(a.position[0], a.position[2], a.position[1], snapshot).y -
        this.#project(b.position[0], b.position[2], b.position[1], snapshot).y,
    );
    for (const plot of sortedPlots) this.#drawSoilPlot(ctx, plot.index, plot.position, plot.wetness, snapshot);
    for (const plot of sortedPlots) this.#drawLegacyCrop(ctx, plot.index, plot.position, plot, snapshot);

    this.#drawFrontFence(ctx, snapshot);
    if (weather.rain > 0) this.#drawRain(ctx, time, weather.rain);
  }

  #drawClouds(ctx: CanvasRenderingContext2D, time: number, cloudiness: number): void {
    if (cloudiness < 0.05) return;
    ctx.save();
    ctx.globalAlpha = 0.12 + cloudiness * 0.22;
    ctx.fillStyle = "#f8fbf4";
    const drift = (time * 8) % (this.#width + 260);
    for (let index = 0; index < 4; index += 1) {
      const x = ((index * 310 + drift) % (this.#width + 260)) - 130;
      const y = 62 + (index % 2) * 54;
      ctx.beginPath();
      ctx.ellipse(x, y, 78, 21, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 49, y + 3, 58, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 44, y + 7, 48, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  #drawCloudShadow(
    ctx: CanvasRenderingContext2D,
    time: number,
    cloudiness: number,
    snapshot: GardenSceneSnapshot,
  ): void {
    if (cloudiness < 0.08) return;
    const center = this.#project(Math.sin(time * 0.08) * 2.8, Math.cos(time * 0.07) * 2.2, -0.35, snapshot);
    ctx.save();
    ctx.globalAlpha = cloudiness * 0.15;
    ctx.fillStyle = "#31483c";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, this.#width * 0.24, this.#height * 0.08, -0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  #drawStones(ctx: CanvasRenderingContext2D, snapshot: GardenSceneSnapshot): void {
    const stones = createStonePositions();
    for (const [index, stone] of stones.entries()) {
      const center = this.#project(stone[0], stone[2], -0.31, snapshot);
      const scale = 0.76 + hash(index * 13 + 7) * 0.3;
      const radiusX = Math.max(5, 18 * scale * snapshot.camera.zoom);
      const radiusY = Math.max(3, 7 * scale * snapshot.camera.zoom);
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((hash(index * 17 + 3) - 0.5) * 0.45);
      ctx.fillStyle = index % 3 === 0 ? "#c7b99b" : index % 3 === 1 ? "#b3aa91" : "#d0c3a6";
      ctx.strokeStyle = "rgba(74,73,60,.23)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  #drawGrass(
    ctx: CanvasRenderingContext2D,
    time: number,
    snapshot: GardenSceneSnapshot,
  ): void {
    const wind = snapshot.weather.wind;
    const sorted = [...this.#grass].sort(
      (a, b) => this.#project(a.x, a.z, -0.27, snapshot).y - this.#project(b.x, b.z, -0.27, snapshot).y,
    );
    for (const blade of sorted) {
      const root = this.#project(blade.x, blade.z, -0.28, snapshot);
      const height = blade.height * Math.min(this.#width / 780, this.#height / 620) * 44 * snapshot.camera.zoom;
      const sway = Math.sin(time * (1.4 + blade.phase * 0.7) + blade.phase * 6.3 + blade.x * 0.8) * wind * 5;
      ctx.strokeStyle = blade.flower > 0.88 ? "#557b43" : blade.flower > 0.52 ? "#688b4f" : "#456f3d";
      ctx.lineWidth = Math.max(1, 1.4 * snapshot.camera.zoom);
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.quadraticCurveTo(root.x + sway * 0.35, root.y - height * 0.55, root.x + sway, root.y - height);
      ctx.stroke();
      if (blade.flower > 0.93) {
        ctx.fillStyle = blade.phase > 0.5 ? "#f5d76c" : "#f0b5c2";
        ctx.beginPath();
        ctx.arc(root.x + sway, root.y - height, Math.max(2, 2.6 * snapshot.camera.zoom), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  #drawSoilPlot(
    ctx: CanvasRenderingContext2D,
    index: number,
    position: Vec3,
    wetness: number,
    snapshot: GardenSceneSnapshot,
  ): void {
    const [x, , z] = position;
    const halfX = 0.62;
    const halfZ = 0.62;
    const top = [
      this.#project(x - halfX, z - halfZ, 0.03, snapshot),
      this.#project(x + halfX, z - halfZ, 0.03, snapshot),
      this.#project(x + halfX, z + halfZ, 0.03, snapshot),
      this.#project(x - halfX, z + halfZ, 0.03, snapshot),
    ];
    const lower = [
      this.#project(x - halfX, z - halfZ, -0.18, snapshot),
      this.#project(x + halfX, z - halfZ, -0.18, snapshot),
      this.#project(x + halfX, z + halfZ, -0.18, snapshot),
      this.#project(x - halfX, z + halfZ, -0.18, snapshot),
    ];
    this.#polygon([top[1]!, top[2]!, lower[2]!, lower[1]!], wetness ? "#4c372a" : "#684a34");
    this.#polygon([top[2]!, top[3]!, lower[3]!, lower[2]!], wetness ? "#493429" : "#5e432f");
    this.#polygon(top, wetness ? "#58402f" : "#866043", "rgba(255,246,224,.28)");

    ctx.save();
    const path = new Path2D();
    path.moveTo(top[0]!.x, top[0]!.y);
    for (let point = 1; point < top.length; point += 1) path.lineTo(top[point]!.x, top[point]!.y);
    path.closePath();
    ctx.clip(path);
    ctx.globalAlpha = wetness ? 0.24 : 0.19;
    for (let grain = 0; grain < 18; grain += 1) {
      const u = hash(index * 101 + grain * 7 + 3);
      const v = hash(index * 131 + grain * 11 + 9);
      const a = mixPoint(top[0]!, top[1]!, u);
      const b = mixPoint(top[3]!, top[2]!, u);
      const point = mixPoint(a, b, v);
      ctx.fillStyle = grain % 3 === 0 ? "#d4a276" : "#3d2d25";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 0.8 + hash(grain + index * 19) * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = wetness ? "#1f2520" : "#39291f";
    ctx.lineWidth = Math.max(1, snapshot.camera.zoom);
    for (const offset of [0.27, 0.5, 0.73]) {
      const left = mixPoint(top[0]!, top[3]!, offset);
      const right = mixPoint(top[1]!, top[2]!, offset);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.quadraticCurveTo((left.x + right.x) * 0.5, (left.y + right.y) * 0.5 + 2, right.x, right.y);
      ctx.stroke();
    }
    ctx.restore();

    const center = this.#project(x, z, 0.14, snapshot);
    this.#hits.push({
      index,
      x: center.x,
      y: center.y,
      radius: Math.max(25, 38 * snapshot.camera.zoom),
    });
  }

  #drawLegacyCrop(
    ctx: CanvasRenderingContext2D,
    _index: number,
    position: Vec3,
    plot: GardenSceneSnapshot["plots"][number],
    snapshot: GardenSceneSnapshot,
  ): void {
    if (!plot.crop || plot.harvested) return;
    const stage = Math.max(1, plot.stage);
    const center = this.#project(position[0], position[2], 0.52 + stage * 0.12, snapshot);
    const size = (18 + stage * 6) * snapshot.camera.zoom;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${size}px system-ui`;
    ctx.shadowColor = "rgba(33,48,32,.2)";
    ctx.shadowBlur = 4;
    ctx.fillText(stage < 3 ? "🌱" : CROPS[plot.crop][1], center.x, center.y);
    ctx.shadowBlur = 0;
    if (plot.pest) {
      ctx.font = `${18 * snapshot.camera.zoom}px system-ui`;
      ctx.fillText("🐛", center.x + size * 0.55, center.y - size * 0.45);
    }
    if (stage >= 4) {
      ctx.font = `${16 * snapshot.camera.zoom}px system-ui`;
      ctx.fillText("✨", center.x - size * 0.55, center.y - size * 0.48);
    }
    ctx.restore();
  }

  #drawBackFence(ctx: CanvasRenderingContext2D, snapshot: GardenSceneSnapshot): void {
    this.#drawFenceSide(ctx, [-4.8, -3.55], [4.8, -3.55], snapshot);
    this.#drawFenceSide(ctx, [4.8, -3.55], [4.8, 3.55], snapshot);
  }

  #drawFrontFence(ctx: CanvasRenderingContext2D, snapshot: GardenSceneSnapshot): void {
    this.#drawFenceSide(ctx, [-4.8, 3.55], [4.8, 3.55], snapshot, true);
    this.#drawFenceSide(ctx, [-4.8, -3.55], [-4.8, 3.55], snapshot, true);
  }

  #drawFenceSide(
    ctx: CanvasRenderingContext2D,
    start: readonly [number, number],
    end: readonly [number, number],
    snapshot: GardenSceneSnapshot,
    front = false,
  ): void {
    const posts = Math.abs(end[0] - start[0]) > Math.abs(end[1] - start[1]) ? 8 : 6;
    const railAStart = this.#project(start[0], start[1], 0.32, snapshot);
    const railAEnd = this.#project(end[0], end[1], 0.32, snapshot);
    const railBStart = this.#project(start[0], start[1], 0.72, snapshot);
    const railBEnd = this.#project(end[0], end[1], 0.72, snapshot);
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = front ? "#795431" : "#6d4e31";
    ctx.lineWidth = Math.max(3, 5 * snapshot.camera.zoom);
    for (const [a, b] of [[railAStart, railAEnd], [railBStart, railBEnd]] as const) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let index = 0; index <= posts; index += 1) {
      const t = index / posts;
      const x = start[0] + (end[0] - start[0]) * t;
      const z = start[1] + (end[1] - start[1]) * t;
      const root = this.#project(x, z, -0.33, snapshot);
      const top = this.#project(x, z, 0.95, snapshot);
      ctx.lineWidth = Math.max(4, 7 * snapshot.camera.zoom);
      ctx.beginPath();
      ctx.moveTo(root.x, root.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  #drawRain(ctx: CanvasRenderingContext2D, time: number, rain: number): void {
    ctx.save();
    ctx.strokeStyle = `rgba(224,241,246,${0.18 + rain * 0.23})`;
    ctx.lineWidth = 1;
    const count = Math.round(24 + rain * 34);
    for (let index = 0; index < count; index += 1) {
      const x = hash(index * 31 + 9) * this.#width;
      const cycle = (hash(index * 47 + 2) + time * (0.4 + rain * 0.35)) % 1;
      const y = cycle * this.#height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 5, y + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  #project(x: number, z: number, y: number, snapshot: GardenSceneSnapshot): Point {
    const angle = snapshot.camera.angle;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const rotatedX = x * cosine - z * sine;
    const rotatedZ = x * sine + z * cosine;
    const scale = Math.min(this.#width / 13.4, this.#height / 9.6) * snapshot.camera.zoom;
    return {
      x: this.#width * 0.5 + (rotatedX - rotatedZ) * scale,
      y: this.#height * 0.59 + (rotatedX + rotatedZ) * scale * 0.42 - y * scale,
    };
  }

  #polygon(points: readonly Point[], fill: string, stroke?: string): void {
    const ctx = this.#context;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

function createGrassSeeds(count: number): GrassSeed[] {
  return Array.from({ length: count }, (_, index) => {
    const side = index % 4;
    const along = hash(index * 17 + 1) * 2 - 1;
    const depth = 0.25 + hash(index * 23 + 5) * 1.2;
    const position = side === 0
      ? { x: along * 4.6, z: -3.3 - depth * 0.45 }
      : side === 1
        ? { x: 3.65 + depth * 0.55, z: along * 3.1 }
        : side === 2
          ? { x: along * 4.6, z: 3.3 + depth * 0.45 }
          : { x: -3.65 - depth * 0.55, z: along * 3.1 };
    return {
      ...position,
      height: 0.55 + hash(index * 29 + 7) * 0.7,
      phase: hash(index * 37 + 11),
      flower: hash(index * 43 + 13),
    };
  });
}

function createStonePositions(): Vec3[] {
  const positions: Vec3[] = [];
  for (let row = 0; row < 9; row += 1) {
    const z = -2.9 + row * 0.72;
    positions.push([-3.42, -0.28, z]);
    positions.push([3.42, -0.28, z]);
  }
  for (let column = 0; column < 10; column += 1) {
    const x = -3.15 + column * 0.7;
    positions.push([x, -0.28, 2.85]);
  }
  return positions;
}

function hash(value: number): number {
  const sine = Math.sin(value * 12.9898 + 78.233) * 43758.5453;
  return sine - Math.floor(sine);
}

function mixPoint(a: Point, b: Point, amount: number): Point {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

function rgb(color: Vec3): string {
  return `rgb(${color.map((component) => Math.round(component * 255)).join(",")})`;
}
