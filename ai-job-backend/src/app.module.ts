import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { InterviewKnowledgeBasesModule } from './interview-knowledge-bases/interview-knowledge-bases.module';
import { InterviewsModule } from './interviews/interviews.module';
import { JobsModule } from './jobs/jobs.module';
import { OverviewModule } from './overview/overview.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { ReportsModule } from './reports/reports.module';
import { ResumesModule } from './resumes/resumes.module';
import { SpeechModule } from './speech/speech.module';
import { UsersModule } from './users/users.module';

@Module({
  // 注册所有业务模块，Nest 启动后会把这些 Controller 的路由挂到应用里。
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ResumesModule,
    JobsModule,
    ProfileModule,
    InterviewKnowledgeBasesModule,
    InterviewsModule,
    SpeechModule,
    ReportsModule,
    OverviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
