import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { AuthModule } from './auth/auth.module';

@Module({
  // 注册 PrismaModule，启动应用时会连接数据库。
  imports: [PrismaModule, AuthModule, UsersModule, ResumesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
