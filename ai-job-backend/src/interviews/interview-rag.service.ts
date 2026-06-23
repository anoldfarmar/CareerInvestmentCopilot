import { Injectable } from '@nestjs/common';
import { cosineSimilarity, generateLocalHashEmbedding } from '../common/ai/local-embedding.util';

export type RagRecord = {
  recordId: string;
  title: string;
  transcript: string;
  structuredContent?: unknown;
  chunks?: unknown;
};

export type RetrievedInterviewChunk = {
  recordId: string;
  recordTitle: string;
  title: string;
  content: string;
  keywords: string[];
  sourceType: string;
  score: number;
};

type RawChunk = {
  id?: string;
  title?: string;
  content?: string;
  keywords?: unknown;
  sourceType?: string;
};

@Injectable()
export class InterviewRagService {
  retrieveRelevantChunks(records: RagRecord[], query: string, topK = 8): RetrievedInterviewChunk[] {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];

    const queryEmbedding = generateLocalHashEmbedding(normalizedQuery);
    const candidates = records.flatMap((record) =>
      this.readChunks(record.chunks).map((chunk, index) => {
        const content = chunk.content?.trim() || record.transcript;
        const embeddingText = [
          record.title,
          chunk.title,
          content,
          this.toStringArray(chunk.keywords).join(' '),
        ].filter(Boolean).join('\n');

        return {
          recordId: record.recordId,
          recordTitle: record.title,
          title: chunk.title?.trim() || `片段 ${index + 1}`,
          content,
          keywords: this.toStringArray(chunk.keywords),
          sourceType: chunk.sourceType ?? 'chunk',
          score: cosineSimilarity(queryEmbedding, generateLocalHashEmbedding(embeddingText)),
        };
      }),
    );

    if (candidates.length === 0) {
      return records
        .filter((record) => record.transcript.trim())
        .map((record) => ({
          recordId: record.recordId,
          recordTitle: record.title,
          title: record.title,
          content: record.transcript.slice(0, 700),
          keywords: [],
          sourceType: 'transcript',
          score: cosineSimilarity(queryEmbedding, generateLocalHashEmbedding(record.transcript)),
        }))
        .sort((left, right) => right.score - left.score)
        .slice(0, topK);
    }

    return candidates
      .filter((chunk) => chunk.content.trim())
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }

  buildMockInterviewContext(input: {
    target: string;
    resumeText?: string;
    jobDescription?: string;
    retrievedChunks: RetrievedInterviewChunk[];
  }) {
    const prompt = [
      '# 模拟面试官任务',
      '',
      '你是 AI 求职助手的模拟面试官。请基于用户简历、目标岗位和真实面试知识库召回内容，生成贴近目标岗位的定制化追问。',
      '',
      '## 本次模拟目标',
      input.target,
      '',
      '## 简历摘要',
      input.resumeText ? this.truncate(input.resumeText, 1200) : '暂无简历摘要',
      '',
      '## 岗位 JD',
      input.jobDescription ? this.truncate(input.jobDescription, 1200) : '暂无岗位 JD',
      '',
      '## RAG 召回片段',
      input.retrievedChunks.length
        ? input.retrievedChunks
            .map((chunk, index) =>
              [
                `${index + 1}. ${chunk.recordTitle} / ${chunk.title} / score=${chunk.score.toFixed(4)}`,
                this.truncate(chunk.content, 600),
              ].join('\n'),
            )
            .join('\n\n')
        : '暂无召回片段',
    ].join('\n');

    return {
      target: input.target,
      prompt,
      retrievedChunkCount: input.retrievedChunks.length,
    };
  }

  private readChunks(value: unknown): RawChunk[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      .map((item) => ({
        id: typeof item.id === 'string' ? item.id : undefined,
        title: typeof item.title === 'string' ? item.title : undefined,
        content: typeof item.content === 'string' ? item.content : undefined,
        keywords: item.keywords,
        sourceType: typeof item.sourceType === 'string' ? item.sourceType : undefined,
      }));
  }

  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  }
}
