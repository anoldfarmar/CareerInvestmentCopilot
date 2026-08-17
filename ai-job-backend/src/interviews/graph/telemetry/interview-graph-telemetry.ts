import { Logger } from '@nestjs/common';

// Step 10：图节点遥测 —— 节点计时、回退统计与结构化 JSON 日志，供决策链还原与 A/B 对比。
// 图服务在每轮执行中采集 NodeTimingEntry，运行结束后输出日志；决策链本身由 routeTrace 承担。

export type NodeTimingEntry = {
  node: string;
  durationMs: number;
  fallback?: boolean;
  retries?: number;
  action?: string;
  at: string;
};

const logger = new Logger('InterviewGraphTelemetry');

export class InterviewGraphTelemetry {
  private readonly entries: NodeTimingEntry[] = [];

  record(entry: NodeTimingEntry): NodeTimingEntry {
    this.entries.push(entry);
    return entry;
  }

  getEntries(): NodeTimingEntry[] {
    return [...this.entries];
  }

  /** 聚合：每节点调用次数 / 平均耗时 / 最大耗时 / 回退次数 */
  summarize() {
    const byNode = new Map<
      string,
      { count: number; totalMs: number; maxMs: number; fallbacks: number }
    >();
    for (const entry of this.entries) {
      const current = byNode.get(entry.node) ?? {
        count: 0,
        totalMs: 0,
        maxMs: 0,
        fallbacks: 0,
      };
      current.count += 1;
      current.totalMs += entry.durationMs;
      current.maxMs = Math.max(current.maxMs, entry.durationMs);
      if (entry.fallback) {
        current.fallbacks += 1;
      }
      byNode.set(entry.node, current);
    }
    return Array.from(byNode.entries()).map(([node, stats]) => ({
      node,
      count: stats.count,
      avgMs: stats.count > 0 ? Math.round(stats.totalMs / stats.count) : 0,
      maxMs: stats.maxMs,
      fallbacks: stats.fallbacks,
    }));
  }

  toLogLines(): string[] {
    return this.entries.map((entry) =>
      JSON.stringify({ event: 'graph.node.timing', ...entry }),
    );
  }

  flushToLog(): void {
    for (const line of this.toLogLines()) {
      logger.log(line);
    }
    for (const summary of this.summarize()) {
      logger.log(JSON.stringify({ event: 'graph.node.summary', ...summary }));
    }
  }
}
