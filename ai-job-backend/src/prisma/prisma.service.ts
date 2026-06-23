// 加载项目根目录中的 .env 文件。
// 这样代码才能读取 DATABASE_URL。
import 'dotenv/config';

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // 从 .env 文件中获取 PostgreSQL 连接地址。
    const connectionString = process.env.DATABASE_URL;

    // 如果没有配置连接地址，立即给出清楚的报错信息。
    if (!connectionString) {
      throw new Error('缺少 DATABASE_URL，请检查项目根目录中的 .env 文件');
    }

    // Prisma 7 必须通过 PostgreSQL adapter 建立数据库连接。
    const adapter = new PrismaPg({ connectionString });

    // 将 adapter 交给 PrismaClient。
    super({ adapter });
  }

  // NestJS 模块初始化时，主动连接数据库。
  async onModuleInit() {
    await this.$connect();
  }
}