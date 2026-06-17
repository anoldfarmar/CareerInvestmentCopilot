import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  const prisma = {
    job: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const service = new JobsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('创建岗位时会绑定当前登录用户 id', async () => {
    const data = {
      title: '前端工程师',
      description: '负责 React 和 TypeScript 开发',
    };

    prisma.job.create.mockResolvedValue({ id: 1, ...data, userId: 10 });

    await service.create(10, data);

    expect(prisma.job.create).toHaveBeenCalledWith({
      data: {
        ...data,
        userId: 10,
      },
    });
  });

  it('查询列表时只返回当前用户的岗位', async () => {
    prisma.job.findMany.mockResolvedValue([]);
    prisma.job.count.mockResolvedValue(0);

    await expect(service.findAll(10, { page: 1, pageSize: 20 })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });

    expect(prisma.job.findMany).toHaveBeenCalledWith({
      where: { userId: 10 },
      orderBy: {
        updatedAt: 'desc',
      },
      skip: 0,
      take: 20,
    });
  });

  it('岗位不存在或不属于当前用户时返回 404', async () => {
    prisma.job.findFirst.mockResolvedValue(null);

    await expect(service.findOne(10, 1)).rejects.toThrow(
      new NotFoundException('岗位不存在'),
    );
  });

  it('修改岗位前会先校验岗位归属', async () => {
    prisma.job.findFirst.mockResolvedValue({
      id: 1,
      userId: 10,
      title: '前端工程师',
    });
    prisma.job.update.mockResolvedValue({
      id: 1,
      userId: 10,
      title: '高级前端工程师',
    });

    await service.update(10, 1, { title: '高级前端工程师' });

    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: { id: 1, userId: 10 },
    });
    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { title: '高级前端工程师' },
    });
  });
});
