import type { Gpu } from "vgpu";

export function observeDeviceLoss(gpu: Gpu, onLost: (error: Error) => void): () => void {
  let active = true;
  void gpu.gpu.lost.then((info: GPUDeviceLostInfo) => {
    if (active) onLost(new Error(`WebGPU device lost: ${info.message || info.reason}`));
  });
  return () => {
    active = false;
  };
}
