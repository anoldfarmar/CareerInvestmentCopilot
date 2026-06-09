import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SaveOptimizedResumeDto } from './dto/save-optimized-resume.dto';
import { SaveStructuredResumeDto } from './dto/save-structured-resume.dto';
import {
  createResumeOptimizeUserPrompt,
  RESUME_OPTIMIZE_SYSTEM_PROMPT,
} from './prompts/resume-optimize.prompt';
import {
  createResumeStructureUserPrompt,
  RESUME_STRUCTURE_SYSTEM_PROMPT,
} from './prompts/resume-structure.prompt';

type DeepseekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class DeepseekService {
  private readonly baseUrl =
    process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';

  private readonly model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-pro';

  // 调用 DeepSeek，将 MinerU Markdown 转为严格的结构化简历对象。
  async structureResume(markdown: string) {
    const content = await this.chatJson(
      RESUME_STRUCTURE_SYSTEM_PROMPT,
      createResumeStructureUserPrompt(markdown),
    );

    return this.parseAndValidate(content, SaveStructuredResumeDto, '简历结构');
  }

  // 调用 DeepSeek 优化结构化简历。JD 可选。
  async optimizeResume(structuredResume: unknown, jobDescription?: string) {
    const content = await this.chatJson(
      RESUME_OPTIMIZE_SYSTEM_PROMPT,
      createResumeOptimizeUserPrompt(structuredResume, jobDescription),
    );

    return this.parseAndValidate(content, SaveOptimizedResumeDto, '优化稿结构');
  }

  // 大模型输出不能直接入库：先解析 JSON，再复用 DTO 做严格校验。
  private async parseAndValidate<T extends object>(
    content: string,
    dtoClass: new () => T,
    structureName: string,
  ) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadGatewayException('DeepSeek 返回的内容不是合法 JSON');
    }

    const dto = plainToInstance(dtoClass, parsed);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    });

    if (errors.length > 0) {
      throw new BadGatewayException(
        `DeepSeek 返回的 JSON 不符合${structureName}：${JSON.stringify(errors)}`,
      );
    }

    return dto;
  }

  // 统一调用 DeepSeek JSON Output，结构化提取与优化共用同一套网络处理。
  private async chatJson(systemPrompt: string, userPrompt: string) {
    const apiKey =
      process.env.DEEPSEEK_API_KEY ?? process.env.Deepseek_API_KEY;

    if (!apiKey) {
      throw new InternalServerErrorException(
        '缺少 DEEPSEEK_API_KEY，请检查 .env 文件',
      );
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: 0,
      }),
    });

    const result = (await response.json()) as DeepseekChatResponse;

    if (!response.ok) {
      throw new BadGatewayException(
        `DeepSeek 请求失败：${result.error?.message ?? `HTTP ${response.status}`}`,
      );
    }

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadGatewayException('DeepSeek 没有返回 JSON 内容');
    }

    return content;
  }
}
