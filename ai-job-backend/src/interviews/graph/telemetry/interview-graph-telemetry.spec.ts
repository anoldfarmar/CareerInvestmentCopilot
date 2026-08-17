import { InterviewGraphTelemetry } from './interview-graph-telemetry';

describe('InterviewGraphTelemetry（Step 10：节点计时与聚合）', () => {
  it('记录节点耗时并输出结构化日志行', () => {
    const telemetry = new InterviewGraphTelemetry();
    telemetry.record({
      node: 'listener',
      durationMs: 120,
      at: '2026-08-16T00:00:00.000Z',
    });
    telemetry.record({
      node: 'speaker',
      durationMs: 800,
      fallback: true,
      at: '2026-08-16T00:00:01.000Z',
    });

    const lines = telemetry.toLogLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('"event":"graph.node.timing"');
    expect(lines[0]).toContain('"node":"listener"');
    expect(lines[0]).toContain('"durationMs":120');
  });

  it('summarize 聚合每节点调用次数/平均耗时/最大耗时/回退数', () => {
    const telemetry = new InterviewGraphTelemetry();
    telemetry.record({ node: 'listener', durationMs: 100, at: 'a' });
    telemetry.record({ node: 'listener', durationMs: 300, at: 'b' });
    telemetry.record({
      node: 'speaker',
      durationMs: 500,
      fallback: true,
      at: 'c',
    });

    const summary = telemetry.summarize();
    expect(summary).toContainEqual({
      node: 'listener',
      count: 2,
      avgMs: 200,
      maxMs: 300,
      fallbacks: 0,
    });
    expect(summary).toContainEqual({
      node: 'speaker',
      count: 1,
      avgMs: 500,
      maxMs: 500,
      fallbacks: 1,
    });
  });
});
