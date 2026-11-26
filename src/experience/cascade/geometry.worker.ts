/// <reference lib="webworker" />
import { buildCascade, type CascadeConfig } from "./geometry";

// Builds the cascade off the main thread and transfers the buffers back (zero-copy).
self.onmessage = (e: MessageEvent<CascadeConfig>) => {
  const g = buildCascade(e.data);
  const transfer = [
    g.positions.buffer,
    g.tangents.buffer,
    g.params.buffer,
    g.indices.buffer,
  ] as ArrayBuffer[];
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(g, transfer);
};
