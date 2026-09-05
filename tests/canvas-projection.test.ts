import { describe, expect, test } from "vitest";
import { canvasProjection, footprint } from "../src/render/canvas2d/canvas-projection";
import { PLOT_POSITIONS } from "../src/scene/snapshot";

const camera = (angle: number, zoom = 1) => ({ angle, zoom, elevation: 1 });

describe("Canvas cartoon world projection", () => {
  test("preserves existing input framing at desktop, portrait and landscape sizes", () => {
    for (const [width, height] of [[1440,900],[390,844],[320,568],[844,390]]) {
      for (const angle of [0,.12,Math.PI/2,Math.PI,Math.PI*1.5]) {
        for (const zoom of [.76,1,1.35,3]) {
          const view = canvasProjection(width!, height!, camera(angle, zoom));
          const s = Math.min(width! / 13.4, height! / 9.6) * zoom;
          for (const [x,y,z] of PLOT_POSITIONS) {
            const rx = x * Math.cos(angle) - z * Math.sin(angle);
            const rz = x * Math.sin(angle) + z * Math.cos(angle);
            const point = view.point(x, z, y);
            expect(point.x).toBeCloseTo(width! * .5 + (rx - rz) * s, 9);
            expect(point.y).toBeCloseTo(height! * .59 + (rx + rz) * s * .42 - y * s, 9);
          }
        }
      }
    }
  });
  test("uses the same height scale for a root, stem and projected soil thickness", () => {
    const view = canvasProjection(1440, 900, camera(.7));
    const root = view.point(1, 2, .03), tip = view.point(1, 2, 1.03);
    expect(tip.x).toBe(root.x);
    expect(root.y - tip.y).toBeCloseTo(view.scale);
    const doubled = canvasProjection(1440,900,camera(.7,2));
    const a = doubled.point(1,2,.03), b = doubled.point(1,2,1.03);
    expect(a.y-b.y).toBeCloseTo(2*view.scale);
  });
  test("front/back faces reverse with the camera, including almost edge-on cases", () => {
    const points = footprint(0,0,.62,.62);
    for (const angle of [0,.12,.7853,.7855,1.5,2.4,4.8]) {
      const a = canvasProjection(1000,700,camera(angle));
      const b = canvasProjection(1000,700,camera(angle+Math.PI));
      const visible = points.map((p,i) => a.facesViewer(p, points[(i+1)%4]!));
      expect(visible.filter(Boolean)).toHaveLength(2);
      points.forEach((p,i) => expect(b.facesViewer(p, points[(i+1)%4]!)).toBe(!visible[i]));
    }
  });
  test("ground depth ignores crop height and reverses the entire plot ordering", () => {
    const a=canvasProjection(1000,700,camera(.23));
    const b=canvasProjection(1000,700,camera(Math.PI+.23));
    const order=(view:typeof a) => PLOT_POSITIONS.map(([x,,z],i)=>({i,d:view.depth(x,z)})).sort((x,y)=>x.d-y.d).map(p=>p.i);
    expect(order(a)).toEqual(order(b).reverse());
  });
  test("bevels stay in their world footprint rather than rounding in screen space", () => {
    const points=footprint(1,2,.62,.62,.075);
    expect(points).toHaveLength(8);
    expect(Math.min(...points.map(p=>p.x))).toBeCloseTo(.38);
    expect(Math.max(...points.map(p=>p.z))).toBeCloseTo(2.62);
    const twiceArea=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length]!;return sum+p.x*q.z-q.x*p.z;},0);
    expect(twiceArea).toBeGreaterThan(2.8);
    expect(twiceArea).toBeLessThan(2*1.24*1.24);
  });
});
