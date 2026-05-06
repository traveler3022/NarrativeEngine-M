const DIMS = 384;
const CALL_TIMEOUT_MS = 30_000;

type WorkerResponse =
    | { type: 'ready'; id: string }
    | { type: 'result'; id: string; vector: number[] | null }
    | { type: 'batchResult'; id: string; vectors: (number[] | null)[] }
    | { type: 'error'; id: string; message: string };

let worker: Worker | null = null;
let ready = false;
const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();

function getWorker(): Worker {
    if (!worker) {
        worker = new Worker(new URL('./embedder.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const { id, type } = e.data;
            const entry = pending.get(id);
            if (!entry) return;
            pending.delete(id);
            clearTimeout(entry.timer);

            if (type === 'ready') {
                ready = true;
                entry.resolve(undefined);
            } else if (type === 'error') {
                entry.reject(new Error(e.data.message));
            } else if (type === 'result') {
                entry.resolve(e.data.vector ? new Float32Array(e.data.vector) : null);
            } else if (type === 'batchResult') {
                entry.resolve(e.data.vectors.map(v => v ? new Float32Array(v) : null));
            }
        };
    }
    return worker;
}

function request<T>(msg: { type: string; id: string } & Record<string, unknown>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(msg.id);
            reject(new Error(`[Embedder] Call timed out (${msg.type})`));
        }, CALL_TIMEOUT_MS);
        pending.set(msg.id, { resolve: resolve as (v: unknown) => void, reject, timer });
        getWorker().postMessage(msg);
    });
}

export async function warmupEmbedder(): Promise<void> {
    if (ready) return;
    try {
        await request<void>({ type: 'warmup', id: `warmup-${Date.now()}` });
    } catch (e) {
        console.warn('[Embedder] Warmup failed:', e);
    }
}

export async function embedText(text: string): Promise<Float32Array | null> {
    try {
        return await request<Float32Array | null>({ type: 'embed', id: `embed-${Date.now()}-${Math.random().toString(36).slice(2)}`, text });
    } catch (e) {
        console.warn('[Embedder] embedText failed:', e);
        return null;
    }
}

export async function embedBatch(texts: string[]): Promise<(Float32Array | null)[]> {
    try {
        return await request<(Float32Array | null)[]>({ type: 'embedBatch', id: `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`, texts });
    } catch (e) {
        console.warn('[Embedder] embedBatch failed:', e);
        return texts.map(() => null);
    }
}

export function isEmbedderReady(): boolean {
    return ready;
}

export function getEmbedDims(): number {
    return DIMS;
}
