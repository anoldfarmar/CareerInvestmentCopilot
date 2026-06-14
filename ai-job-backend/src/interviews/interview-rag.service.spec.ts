import { InterviewRagService, type RagRecord } from './interview-rag.service';

describe('InterviewRagService', () => {
  let service: InterviewRagService;

  beforeEach(() => {
    service = new InterviewRagService();
  });

  it('retrieves relevant chunks from built knowledge records', () => {
    const records: RagRecord[] = [
      {
        recordId: 'record-1',
        title: '推荐系统一面',
        transcript: '面试官追问了召回、粗排和 AB 实验。',
        chunks: [
          {
            title: '向量召回',
            content: '候选人需要解释 embedding、ANN、召回率和延迟之间的权衡。',
            keywords: ['embedding', 'ANN', '召回'],
            sourceType: 'question',
          },
        ],
      },
      {
        recordId: 'record-2',
        title: '行为面试',
        transcript: '主要讨论跨团队沟通和冲突处理。',
        chunks: [
          {
            title: '沟通协作',
            content: '候选人需要说明如何推进跨团队项目。',
            keywords: ['沟通'],
            sourceType: 'summary',
          },
        ],
      },
    ];

    const chunks = service.retrieveRelevantChunks(records, '推荐系统 embedding 召回怎么设计', 1);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      recordId: 'record-1',
      recordTitle: '推荐系统一面',
      title: '向量召回',
      sourceType: 'question',
    });
    expect(chunks[0].score).toBeGreaterThan(0);
  });

  it('falls back to transcript retrieval when records have no built chunks', () => {
    const records: RagRecord[] = [
      {
        recordId: 'record-1',
        title: '数据分析面试',
        transcript: '面试官重点追问了 SQL、漏斗分析和留存指标。',
        chunks: [],
      },
    ];

    const chunks = service.retrieveRelevantChunks(records, 'SQL 留存指标', 3);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({
      recordId: 'record-1',
      title: '数据分析面试',
      sourceType: 'transcript',
    });
    expect(chunks[0].content).toContain('SQL');
  });

  it('builds a mock interview context with retrieved evidence', () => {
    const context = service.buildMockInterviewContext({
      target: '后端开发一面',
      resumeText: 'NestJS、PostgreSQL、队列和缓存经验',
      jobDescription: '要求熟悉 Node.js 和数据库性能优化',
      retrievedChunks: [
        {
          recordId: 'record-1',
          recordTitle: '后端一面',
          title: '事务问题',
          content: '面试官追问了事务隔离级别和慢查询优化。',
          keywords: ['事务', '慢查询'],
          sourceType: 'question',
          score: 0.82,
        },
      ],
    });

    expect(context.retrievedChunkCount).toBe(1);
    expect(context.prompt).toContain('后端开发一面');
    expect(context.prompt).toContain('事务隔离级别');
  });
});
