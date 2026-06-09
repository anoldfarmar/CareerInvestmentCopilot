import { BadGatewayException, Injectable } from '@nestjs/common';

type MineruResponse<T> = {
  code: number;
  msg: string;
  trace_id: string;
  data: T;
};

type CreateFileTaskData = {
  task_id: string;
  file_url: string;
};

type MineruTaskData = {
  task_id: string;
  state:
    | 'waiting-file'
    | 'uploading'
    | 'pending'
    | 'running'
    | 'done'
    | 'failed';
  markdown_url?: string;
  err_code?: number;
  err_msg?: string;
};

export type MineruTaskResult = MineruTaskData & {
  markdownContent?: string;
};

@Injectable()
export class MineruService {
  // Agent 轻量 API 无需密钥。地址放进环境变量，便于切换环境。
  private readonly baseUrl =
    process.env.MINERU_AGENT_BASE_URL ?? 'https://mineru.net/api/v1/agent';

  // 1. 向 MinerU 申请签名上传 URL。
  // 2. 将内存中的文件直接 PUT 到 MinerU 提供的 OSS 地址。
  async submitFile(file: Express.Multer.File, filename: string) {
    const task = await this.request<CreateFileTaskData>('/parse/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_name: filename,
        language: 'ch',
        enable_table: true,
        is_ocr: false,
        enable_formula: true,
      }),
    });

    const uploadResponse = await fetch(task.file_url, {
      method: 'PUT',
      // 转为标准 Uint8Array，内容不变，同时符合 fetch 的 BodyInit 类型。
      body: Uint8Array.from(file.buffer),
    });

    if (!uploadResponse.ok) {
      throw new BadGatewayException(
        `上传文件到 MinerU 失败，HTTP ${uploadResponse.status}`,
      );
    }

    return {
      taskId: task.task_id,
      state: 'pending',
    };
  }

  // 查询 MinerU 异步解析任务状态。
  // 完成后顺便下载 Markdown，前端无需再请求第三方 CDN。
  async getTask(taskId: string): Promise<MineruTaskResult> {
    const task = await this.request<MineruTaskData>(
      `/parse/${encodeURIComponent(taskId)}`,
    );

    if (task.state !== 'done' || !task.markdown_url) {
      return task;
    }

    const markdownResponse = await fetch(task.markdown_url);
    if (!markdownResponse.ok) {
      throw new BadGatewayException(
        `下载 MinerU Markdown 失败，HTTP ${markdownResponse.status}`,
      );
    }

    return {
      ...task,
      markdownContent: await markdownResponse.text(),
    };
  }

  // 统一处理 MinerU 的 HTTP 错误和业务错误码。
  private async request<T>(path: string, init?: RequestInit) {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, init);
      if (!response.ok) {
        throw new BadGatewayException(
          `MinerU 请求失败，HTTP ${response.status}`,
        );
      }

      const result = (await response.json()) as MineruResponse<T>;
      if (result.code !== 0) {
        throw new BadGatewayException(`MinerU 请求失败：${result.msg}`);
      }

      return result.data;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      throw new BadGatewayException('无法连接 MinerU 服务');
    }
  }
}
