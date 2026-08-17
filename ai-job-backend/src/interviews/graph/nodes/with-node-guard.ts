import type { RouteTraceEntry } from '../interview-graph.state';

// Step 9：节点守护 —— 为外部调用提供超时 / 重试 / 兜底回退的统一包装。
// 超时：Promise.race 兜底（调用本身继续执行，不阻塞返回）；
// 重试：总尝试次数 = 1 + retries；
// 兜底：全部失败后执行 fallback（本地规则节点），并把回退原因写入 trace。

export type NodeGuardOptions = {
  timeoutMs: number;
  retries: number;
  logKey: string; // 节点名，如 'listener' / 'speaker'
  fallback: () => Promise<Record<string, unknown>>;
};

export type NodeGuardResult<TUpdate extends Record<string, unknown>> = {
  update: TUpdate;
  trace: RouteTraceEntry[]; // 兜底时为 [{ node, detail: 'fallback:<原因>', at }]
};

export async function withNodeGuard<TUpdate extends Record<string, unknown>>(
  run: () => Promise<TUpdate>,
  options: NodeGuardOptions,
): Promise<NodeGuardResult<TUpdate>> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      const update = await withTimeout(run(), options.timeoutMs);
      return { update, trace: [] };
    } catch (error) {
      lastError = error;
    }
  }
  const update = (await options.fallback()) as TUpdate;
  return {
    update,
    trace: [
      {
        node: options.logKey,
        detail: `fallback:${lastError instanceof Error ? lastError.message : String(lastError)}`,
        at: new Date().toISOString(),
      },
    ],
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`节点超时（${timeoutMs}ms）`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
