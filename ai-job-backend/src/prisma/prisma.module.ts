import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() 类似把工具注册成前端全局插件。
// 后续其他模块可以直接注入 PrismaService。
@Global()
@Module({
  providers: [PrismaService],

  // 导出 PrismaService，其他模块才能使用它。
  exports: [PrismaService],
})
export class PrismaModule {}