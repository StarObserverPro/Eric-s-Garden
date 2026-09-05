/** Test-only fixture; bundled separately, never imported by the production app.
 * Synthetic scenes prove rendering/picking, not game progression. */
import { blankState, type CropId, type WeatherId } from "../src/game/model";
import { PLOT_POSITIONS, createSceneSnapshot, type GardenSceneSnapshot } from "../src/scene/snapshot";
import { Canvas2DRenderer } from "../src/render/canvas2d/canvas2d-renderer";

interface Spec {
  angle?: number; zoom?: number; stage?: number; weather?: WeatherId;
  empty?: boolean; wet?: boolean; pests?: boolean; harvested?: boolean;
}
const crops: readonly CropId[] = ["carrot", "tomato", "corn", "pumpkin", "lettuce", "strawberry"];
let renderer: Canvas2DRenderer | undefined;
let snapshot: GardenSceneSnapshot;
let canvas: HTMLCanvasElement;

const api = {
  draw(spec: Spec = {}) {
    renderer?.dispose();
    canvas = document.querySelector("canvas")!;
    const state = blankState(); state.level = 4;
    const weather = Array.from({ length: 5 }, (_, round) => {
      state.round = round; return createSceneSnapshot(state).weather;
    }).find(w => w.id === (spec.weather ?? "sunny"))!;
    snapshot = {
      camera: { angle: spec.angle ?? .12, zoom: spec.zoom ?? 1, elevation: 1 }, level: 4, weather,
      plots: PLOT_POSITIONS.map((position, index) => ({
        index, position, crop: spec.empty ? null : crops[index % crops.length]!,
        stage: spec.stage ?? 4, harvested: spec.harvested ?? false,
        wetness: spec.wet === undefined ? Number(index % 2 === 0) : Number(spec.wet),
        pest: !!spec.pests && index % 3 === 0,
      })),
    };
    renderer = new Canvas2DRenderer(canvas, 2);
    renderer.setSnapshot(snapshot); renderer.render(1900);
    return { renderer: renderer.kind, snapshot, metrics: renderer.metrics(), width: canvas.clientWidth, height: canvas.clientHeight };
  },
  pick(x: number, y: number) { return renderer!.pickPlot(x, y); },
  resize() { renderer!.resize(); renderer!.render(1900); },
  dispose() { renderer!.dispose(); return renderer!.pickPlot(0, 0); },
  fingerprint() {
    const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (let i = 0; i < pixels.length; i += 1) hash = Math.imul(hash ^ pixels[i]!, 16777619);
    return hash >>> 0;
  },
};
Object.assign(window, { canvasEvidence: api });
