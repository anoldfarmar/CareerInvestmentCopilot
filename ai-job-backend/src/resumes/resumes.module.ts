import { Module } from '@nestjs/common';
import { DeepseekService } from './deepseek.service';
import { MineruService } from './mineru.service';
import { ResumePdfService } from './resume-pdf.service';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, MineruService, DeepseekService, ResumePdfService],
})
export class ResumesModule {}
