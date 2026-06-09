import { BadRequestException } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { MineruService } from './mineru.service';
import { ResumesService } from './resumes.service';

describe('ResumesService', () => {
  // mock 类似前端测试中的假接口：只测试业务规则，不连接真实数据库和第三方服务。
  const prisma = {
    resume: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mineruService = {
    submitFile: jest.fn(),
    getTask: jest.fn(),
  };

  const deepseekService = {
    structureResume: jest.fn(),
    optimizeResume: jest.fn(),
  };

  const service = new ResumesService(
    prisma as never,
    mineruService as unknown as MineruService,
    deepseekService as unknown as DeepseekService,
  );

  beforeEach(() => {
    // 每个测试开始前清空调用记录，避免测试互相影响。
    jest.clearAllMocks();
  });

  it('没有 Markdown 时，不允许调用 DeepSeek 结构化简历', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      originalContent: '',
    });

    await expect(service.structureWithAi(1, 1)).rejects.toThrow(
      new BadRequestException('简历尚无 Markdown 内容，请先完成 MinerU 解析'),
    );

    expect(deepseekService.structureResume).not.toHaveBeenCalled();
  });

  it('没有 structuredContent 时，不允许调用 DeepSeek 优化简历', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      structuredContent: null,
    });

    await expect(service.optimizeWithAi(1, 1)).rejects.toThrow(
      new BadRequestException('简历尚未结构化，请先调用结构化接口'),
    );

    expect(deepseekService.optimizeResume).not.toHaveBeenCalled();
  });

  it('传入 JD 时，将 JD 交给 DeepSeek 并保存优化稿', async () => {
    const structuredContent = {
      skills: ['TypeScript'],
    };
    const optimizedContent = {
      optimizedResume: structuredContent,
      optimizationNotes: ['突出已有 TypeScript 技能'],
    };

    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      structuredContent,
    });
    deepseekService.optimizeResume.mockResolvedValue(optimizedContent);
    prisma.resume.update.mockResolvedValue({
      id: 1,
      optimizedContent,
    });

    await service.optimizeWithAi(1, 1, '岗位要求：熟悉 TypeScript');

    expect(deepseekService.optimizeResume).toHaveBeenCalledWith(
      structuredContent,
      '岗位要求：熟悉 TypeScript',
    );
    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        optimizedContent,
      },
    });
  });
});
