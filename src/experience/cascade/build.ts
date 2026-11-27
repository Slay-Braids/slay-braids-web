import { buildCascade, type CascadeConfig, type CascadeGeometryData } from "./geometry";

/** Build the cascade in a module worker; falls back to the main thread if workers fail. */
export function buildCascadeAsync(cfg: CascadeConfig): Promise<CascadeGeometryData> {
  return new Promise((resolve) => {
    let worker: Worker | undefined;
    try {
      worker = new Worker(new URL("./geometry.worker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve(buildCascade(cfg));
      return;
    }
    const fallback = () => {
      worker?.terminate();
      resolve(buildCascade(cfg));
    };
    worker.onmessage = (e: MessageEvent<CascadeGeometryData>) => {
      worker?.terminate();
      resolve(e.data);
    };
    worker.onerror = fallback;
    worker.postMessage(cfg);
  });
}
