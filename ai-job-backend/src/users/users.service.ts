import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// 创建用户时允许前端提交的数据结构。
// name 后面的问号表示：姓名可以不填写。
type CreateUserData = {
  email: string;
  name?: string;
};

// 修改用户时，所有字段都允许按需提交。
type UpdateUserData = {
  email?: string;
  name?: string;
};

@Injectable()
export class UsersService {
  // NestJS 会自动注入之前创建的数据库客户端。
  constructor(private readonly prisma: PrismaService) {}

  // 保存用户。async 类似前端请求接口时使用 async/await。
  async create(data: CreateUserData) {
    try {
      return await this.prisma.user.create({
        data,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // P2002 是 Prisma 的唯一约束冲突错误码。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('该邮箱已被注册');
      }

      // 如果不是已知错误，继续抛出，避免隐藏真实问题。
      throw error;
    }
  }

  // 查询所有用户，并让最新创建的用户显示在最前面。
  findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // 根据主键查询一个用户。
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 找不到用户时，返回比 null 更清楚的 404 响应。
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  // 修改指定用户，只更新前端实际提交的字段。
  async update(id: number, data: UpdateUserData) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // P2002 表示新的邮箱已经被其他用户使用。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('该邮箱已被注册');
      }

      // P2025 表示数据库中找不到需要修改的用户。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('用户不存在');
      }

      throw error;
    }
  }

  // 删除指定用户，并返回被删除的用户数据。
  async remove(id: number) {
    try {
      return await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      // P2025 表示数据库中找不到需要删除的用户。
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('用户不存在');
      }

      throw error;
    }
  }
}
