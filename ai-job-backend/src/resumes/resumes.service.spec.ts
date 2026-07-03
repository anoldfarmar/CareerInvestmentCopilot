import { BadRequestException } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { MineruService } from './mineru.service';
import { ResumePdfService } from './resume-pdf.service';
import { ResumesService } from './resumes.service';

describe('ResumesService', () => {
  // mock 类似前端测试中的假接口：只测试业务规则，不连接真实数据库和第三方服务。
  const prisma = {
    resume: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    resumeVersion: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    resumeExport: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (callback) => callback(prisma)),
  };

  const mineruService = {
    submitFile: jest.fn(),
    getTask: jest.fn(),
  };

  const deepseekService = {
    structureResume: jest.fn(),
    optimizeResume: jest.fn(),
  };

  const resumePdfService = {
    assertExportable: jest.fn((resume) => {
      if (!resume) {
        throw new BadRequestException('请先完成结构化或优化后再导出 PDF');
      }
    }),
    generatePdf: jest.fn(),
  };

  const service = new ResumesService(
    prisma as never,
    mineruService as unknown as MineruService,
    deepseekService as unknown as DeepseekService,
    resumePdfService as unknown as ResumePdfService,
  );

  beforeEach(() => {
    // 每个测试开始前清空调用记录，避免测试互相影响。
    jest.clearAllMocks();
    prisma.resume.updateMany.mockResolvedValue({ count: 1 });
    prisma.resumeVersion.findUnique.mockResolvedValue(null);
    prisma.resumeExport.findUnique.mockResolvedValue(null);
    prisma.resumeExport.upsert.mockResolvedValue({});
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
      undefined,
    );
    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        optimizedContent,
        draftContent: optimizedContent,
        optimizeStatus: 'done',
      },
    });
  });

  it('已有优化诊断时，继续优化仍基于原始结构化简历和用户补充要求', async () => {
    const structuredContent = {
      summary: '原始总结',
    };
    const currentOptimizedResume = {
      summary: '已优化总结',
    };
    const nextOptimizedContent = {
      optimizedResume: {
        summary: '进一步优化后的总结',
      },
      optimizationNotes: ['根据用户补充要求继续调整'],
    };

    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      structuredContent,
      optimizedContent: {
        optimizedResume: currentOptimizedResume,
        optimizationNotes: ['上一轮优化说明'],
      },
    });
    deepseekService.optimizeResume.mockResolvedValue(nextOptimizedContent);
    prisma.resume.update.mockResolvedValue({
      id: 1,
      optimizedContent: nextOptimizedContent,
    });

    await service.optimizeWithAi(
      1,
      1,
      '岗位要求：熟悉 TypeScript',
      '请进一步突出项目经历',
    );

    expect(deepseekService.optimizeResume).toHaveBeenCalledWith(
      structuredContent,
      '岗位要求：熟悉 TypeScript',
      '请进一步突出项目经历',
    );
  });

  it('自动保存优化草稿时，只更新 draftContent，不创建正式版本', async () => {
    const draftContent = {
      optimizedResume: { summary: '用户正在编辑的草稿' },
      optimizationNotes: ['草稿自动保存'],
    };
    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      draftContent: null,
    });
    prisma.resume.update.mockResolvedValue({
      id: 1,
      draftContent,
    });

    await service.saveDraftContent(1, 1, { content: draftContent as never });

    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        draftContent,
      },
    });
    expect(prisma.resumeVersion.create).not.toHaveBeenCalled();
  });

  it('确认最终版时，写入 finalizedContent、finalizedAt，并创建最终版本记录', async () => {
    const draftContent = {
      optimizedResume: { summary: '最终确认的版本' },
      optimizationNotes: ['用户确认定稿'],
    };
    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      optimizationVersion: 2,
      draftContent,
      optimizedContent: null,
    });
    prisma.resume.update.mockResolvedValue({
      id: 1,
      finalizedContent: draftContent,
    });

    await service.finalizeResume(1, 1, { label: '投递 A 公司版' });

    expect(prisma.resumeVersion.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        resumeId: 1,
        version: 3,
        label: '投递 A 公司版',
        source: 'finalized',
        content: draftContent,
        isFinal: true,
      }),
    });
    expect(prisma.resume.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        optimizedContent: draftContent,
        draftContent,
        finalizedContent: draftContent,
        optimizationVersion: 3,
      }),
    });
  });

  it('没有结构化或优化稿时，不允许导出 PDF', async () => {
    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      title: '测试简历',
      structuredContent: null,
      optimizedContent: null,
    });

    await expect(service.exportPdf(1, 1, 'classic')).rejects.toThrow(
      new BadRequestException('请先完成结构化或优化后再导出 PDF'),
    );

    expect(resumePdfService.generatePdf).not.toHaveBeenCalled();
  });

  it('有优化稿时，PDF 导出优先使用 optimizedContent.optimizedResume', async () => {
    const structuredContent = {
      summary: '原始结构化总结',
    };
    const optimizedResume = {
      summary: '优化后的总结',
    };
    const pdf = Buffer.from('pdf');

    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      title: '测试简历',
      structuredContent,
      optimizedContent: {
        optimizedResume,
        optimizationNotes: ['优化说明'],
      },
    });
    resumePdfService.generatePdf.mockResolvedValue(pdf);

    await expect(service.exportPdf(1, 1, 'modern')).resolves.toBe(pdf);

    expect(resumePdfService.assertExportable).toHaveBeenCalledWith(optimizedResume);
    expect(resumePdfService.generatePdf).toHaveBeenCalledWith('测试简历', optimizedResume, 'modern');
  });

  it('没有优化稿但有结构化内容时，PDF 导出使用 structuredContent', async () => {
    const structuredContent = {
      summary: '结构化总结',
    };
    const pdf = Buffer.from('pdf');

    prisma.resume.findFirst.mockResolvedValue({
      id: 1,
      title: '测试简历',
      structuredContent,
      optimizedContent: null,
    });
    resumePdfService.generatePdf.mockResolvedValue(pdf);

    await expect(service.exportPdf(1, 1, 'classic')).resolves.toBe(pdf);

    expect(resumePdfService.assertExportable).toHaveBeenCalledWith(structuredContent);
    expect(resumePdfService.generatePdf).toHaveBeenCalledWith('测试简历', structuredContent, 'classic');
  });
});
