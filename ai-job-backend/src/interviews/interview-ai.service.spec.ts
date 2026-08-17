import { InterviewAiService } from './interview-ai.service';
import { externalFetch } from '../common/http/external-http.client';
import type { StrategistDecision } from './graph/interview-graph.state';

jest.mock('../common/http/external-http.client', () => ({
  externalFetch: jest.fn(),
}));

const mockedExternalFetch = externalFetch as jest.Mock;

describe('InterviewAiService（Step 7：Speaker 原生流式）', () => {
  const previousApiKey = process.env.DEEPSEEK_API_KEY;

  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (previousApiKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = previousApiKey;
    }
  });

  function makeSseResponse(chunks: string[]) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
    return { ok: true, body: stream, json: jest.fn() } as unknown as Response;
  }

  function makeSseDelta(content: string) {
    return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
  }

  function makeDecision(): StrategistDecision {
    return {
      action: 'continue_deep_dive',
      nextState: 'S2_CORE_DEEP_DIVE',
      messageType: 'follow_up',
      reason: '继续追问。',
      targetCapability: '建模能力',
      speakerInstruction: '请继续追问：介绍一下指标口径。',
      memoryPatch: [],
    };
  }

  it('解析 SSE 增量并拼接完整内容，messageType 按动作推导', async () => {
    mockedExternalFetch.mockResolvedValue(
      makeSseResponse([
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"，请"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"介绍项目。"}}]}\n\n',
        'data: [DONE]\n\n',
      ]),
    );
    const service = new InterviewAiService();
    const deltas: string[] = [];
    const output = await service.streamSpeaker(
      {
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: '答',
        recentRawMessages: [],
        decision: makeDecision(),
      },
      (delta) => deltas.push(delta),
    );

    expect(deltas).toEqual(['你好', '，请', '介绍项目。']);
    expect(output.content).toBe('你好，请介绍项目。');
    expect(output.messageType).toBe('follow_up');
    const callArgs = mockedExternalFetch.mock.calls[0] as unknown as [
      string,
      { body?: string },
    ];
    expect(callArgs?.[0]).toContain('/chat/completions');
    expect(callArgs?.[1]?.body ?? '').toContain('"stream":true');
    expect(callArgs?.[1]?.body ?? '').toContain('不要输出 JSON');
  });

  it('模型仍返回分片 JSON 时只推送 content，不向前端暴露协议字段', async () => {
    mockedExternalFetch.mockResolvedValue(
      makeSseResponse([
        makeSseDelta('{"messageType":"follow_up",'),
        makeSseDelta('"content":"请介绍一下指标口径。"}'),
        'data: [DONE]\n\n',
      ]),
    );
    const service = new InterviewAiService();
    const deltas: string[] = [];
    const output = await service.streamSpeaker(
      {
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: '答',
        recentRawMessages: [],
        decision: makeDecision(),
      },
      (delta) => deltas.push(delta),
    );

    expect(deltas).toEqual(['请介绍一下指标口径。']);
    expect(output).toEqual({
      messageType: 'follow_up',
      content: '请介绍一下指标口径。',
    });
  });

  it('流式内容为空时回退 speakerInstruction，并支持跨 chunk 分行解析', async () => {
    mockedExternalFetch.mockResolvedValue(
      makeSseResponse([
        'data: {"choices":[{"delta":{"content":"第一段"}}]}\n',
        'data: {"choices":[{"delta":{"content":"第二段"}}]}\n\ndata: [DONE]\n\n',
      ]),
    );
    const service = new InterviewAiService();
    const deltas: string[] = [];
    const output = await service.streamSpeaker(
      {
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: '',
        recentRawMessages: [],
        decision: makeDecision(),
      },
      (delta) => deltas.push(delta),
    );

    expect(deltas).toEqual(['第一段', '第二段']);
    expect(output.content).toBe('第一段第二段');
  });

  it('缺少 DEEPSEEK_API_KEY 时抛出 500', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const service = new InterviewAiService();
    await expect(
      service.streamSpeaker({
        stage: 'S2_CORE_DEEP_DIVE',
        latestAnswer: '',
        recentRawMessages: [],
        decision: makeDecision(),
      }),
    ).rejects.toThrow();
  });
});
