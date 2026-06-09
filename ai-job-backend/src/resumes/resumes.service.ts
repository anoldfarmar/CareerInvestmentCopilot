import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SaveOptimizedResumeDto } from './dto/save-optimized-resume.dto';
import { SaveStructuredResumeDto } from './dto/save-structured-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { DeepseekService } from './deepseek.service';
import { MineruService } from './mineru.service';

// 创建简历时允许前端提交的数据结构。
type CreateResumeData = {
  title: string;
  originalContent?: string;
};

@Injectable()
export class ResumesService {
  // NestJS 会自动注入之前创建的数据库客户端。
  constructor(
    private readonly prisma: PrismaService,
    private readonly mineruService: MineruService,
    private readonly deepseekService: DeepseekService,
  ) {}

  // 保存简历前，先确认所属用户真实存在。
  async create(userId: number, data: CreateResumeData) {
    return this.prisma.resume.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  // 查询所有简历，并附带所属用户的基础信息。
  findAll(userId: number) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  // 根据主键查询一份完整简历。
  async findOne(userId: number, id: number) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    return resume;
  }

  // 修改指定简历，只更新前端实际提交的字段。
  async update(userId: number, id: number, data: UpdateResumeDto) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.resume.update({
        where: { id },
        data: {
          title: data.title,
          originalContent: data.originalContent,
        },
      });
    } catch (error) {
      // P2025 表示数据库中找不到需要修改的简历。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  // 删除指定简历，并返回被删除的简历数据。
  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.resume.delete({
        where: { id },
      });
    } catch (error) {
      // P2025 表示数据库中找不到需要删除的简历。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  // 将上传文件交给 MinerU，并把异步任务 id 绑定到指定简历。
  async submitParseTask(
    userId: number,
    id: number,
    file: Express.Multer.File,
    filename: string,
  ) {
    await this.findOne(userId, id);

    const task = await this.mineruService.submitFile(file, filename);

    return this.prisma.resume.update({
      where: { id },
      data: {
        mineruTaskId: task.taskId,
        parseStatus: task.state,
      },
    });
  }

  // 查询 MinerU 任务状态，并将最新状态同步到数据库。
  // 完成后，自动把 Markdown 保存为简历原始文本。
  async syncParseTask(userId: number, id: number) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (!resume.mineruTaskId) {
      throw new NotFoundException('该简历尚未提交解析任务');
    }

    const task = await this.mineruService.getTask(resume.mineruTaskId);

    return this.prisma.resume.update({
      where: { id },
      data: {
        parseStatus: task.state,
        // MinerU 完成解析后才返回 Markdown。处理中时保留原有内容。
        originalContent: task.markdownContent ?? undefined,
      },
    });
  }

  // 保存通过 DTO 校验的结构化简历。
  // 未来大模型输出 JSON 后，也必须经过同一套校验规则再调用这里。
  async saveStructuredContent(userId: number, id: number, data: SaveStructuredResumeDto) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.resume.update({
        where: { id },
        data: {
          structuredContent: data as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  // 保存优化稿。它与 structuredContent 分开，便于前端做前后对比。
  // 未来大模型优化后的 JSON 也必须先经过同一个 DTO 校验。
  async saveOptimizedContent(userId: number, id: number, data: SaveOptimizedResumeDto) {
    await this.findOne(userId, id);
    try {
      return await this.prisma.resume.update({
        where: { id },
        data: {
          optimizedContent: data as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('简历不存在');
      }

      throw error;
    }
  }

  // 使用 DeepSeek 将 MinerU Markdown 转为结构化 JSON，并保存进数据库。
  async structureWithAi(userId: number, id: number) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (!resume.originalContent.trim()) {
      throw new BadRequestException('简历尚无 Markdown 内容，请先完成 MinerU 解析');
    }

    const structuredContent = await this.deepseekService.structureResume(
      resume.originalContent,
    );

    return this.prisma.resume.update({
      where: { id },
      data: {
        structuredContent: structuredContent as Prisma.InputJsonValue,
      },
    });
  }

  // 使用 DeepSeek 生成优化稿。JD 可选，结果与原始结构化简历分开保存。
  async optimizeWithAi(userId: number, id: number, jobDescription?: string) {
    const resume = await this.prisma.resume.findFirst({
      where: { id, userId },
    });

    if (!resume) {
      throw new NotFoundException('简历不存在');
    }

    if (!resume.structuredContent) {
      throw new BadRequestException('简历尚未结构化，请先调用结构化接口');
    }

    const optimizedContent = await this.deepseekService.optimizeResume(
      resume.structuredContent,
      jobDescription,
    );

    return this.prisma.resume.update({
      where: { id },
      data: {
        optimizedContent: optimizedContent as unknown as Prisma.InputJsonValue,
      },
    });
  }
}
