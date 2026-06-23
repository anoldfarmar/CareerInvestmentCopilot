import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { CreateAudioRecordDto } from './dto/create-audio-record.dto';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { CreateManualRecordDto } from './dto/create-manual-record.dto';
import { TranscribeAudioRecordDto } from './dto/transcribe-audio-record.dto';
import { InterviewKnowledgeBasesService } from './interview-knowledge-bases.service';

@ApiTags('interview-knowledge-bases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interview-knowledge-bases')
export class InterviewKnowledgeBasesController {
  constructor(private readonly knowledgeBasesService: InterviewKnowledgeBasesService) {}

  @Post()
  @ApiOperation({ summary: '创建真实面试知识库' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateKnowledgeBaseDto) {
    return this.knowledgeBasesService.create(user.id, body);
  }

  @Get()
  @ApiOperation({ summary: '查询真实面试知识库列表' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.knowledgeBasesService.findAll(user.id, query);
  }

  @Get(':knowledgeBaseId')
  @ApiOperation({ summary: '查询知识库详情' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  findOne(@CurrentUser() user: AuthUser, @Param('knowledgeBaseId') knowledgeBaseId: string) {
    return this.knowledgeBasesService.findOne(user.id, knowledgeBaseId);
  }

  @Delete(':knowledgeBaseId')
  @ApiOperation({ summary: '删除真实面试知识库，同时删除其中的面试记录' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  remove(@CurrentUser() user: AuthUser, @Param('knowledgeBaseId') knowledgeBaseId: string) {
    return this.knowledgeBasesService.remove(user.id, knowledgeBaseId);
  }

  @Post(':knowledgeBaseId/records/manual')
  @ApiOperation({ summary: '手动新增真实面试文本记录' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  createManualRecord(
    @CurrentUser() user: AuthUser,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: CreateManualRecordDto,
  ) {
    return this.knowledgeBasesService.createManualRecord(user.id, knowledgeBaseId, body);
  }

  @Post(':knowledgeBaseId/records/audio')
  @ApiOperation({ summary: '上传真实面试音频记录元信息' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'interviewDate'],
      properties: {
        title: { type: 'string', example: '某厂二面录音' },
        interviewDate: { type: 'string', example: '2026-06-11' },
        audioUrl: {
          type: 'string',
          example: 'https://example.com/interview-audio.m4a',
          description: '公网可访问音频 URL；audioFile 与 audioUrl 二选一',
        },
        audioFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('audioFile'))
  createAudioRecord(
    @CurrentUser() user: AuthUser,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: CreateAudioRecordDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 100 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    return this.knowledgeBasesService.createAudioRecord(user.id, knowledgeBaseId, body, file);
  }

  @Post(':knowledgeBaseId/records/audio/pipeline')
  @ApiOperation({ summary: '上传真实面试音频并自动完成 ASR 转写与知识库构建' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'interviewDate'],
      properties: {
        title: { type: 'string', example: '某厂二面录音' },
        interviewDate: { type: 'string', example: '2026-06-11' },
        audioUrl: {
          type: 'string',
          example: 'https://example.com/interview-audio.m4a',
          description: '公网可访问音频 URL；audioFile 与 audioUrl 二选一',
        },
        audioFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('audioFile'))
  createAudioRecordPipeline(
    @CurrentUser() user: AuthUser,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Body() body: CreateAudioRecordDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 100 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    return this.knowledgeBasesService.createAudioRecordPipeline(user.id, knowledgeBaseId, body, file);
  }

  @Post('records/audio/pipeline')
  @ApiOperation({ summary: '上传真实面试音频并自动沉淀到用户面试知识库' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'interviewDate'],
      properties: {
        title: { type: 'string', example: '某厂二面录音' },
        interviewDate: { type: 'string', example: '2026-06-11' },
        audioUrl: {
          type: 'string',
          example: 'https://example.com/interview-audio.m4a',
          description: '公网可访问音频 URL；audioFile 与 audioUrl 二选一',
        },
        audioFile: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('audioFile'))
  createUserAudioRecordPipeline(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAudioRecordDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 100 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    file?: Express.Multer.File,
  ) {
    return this.knowledgeBasesService.createUserAudioRecordPipeline(user.id, body, file);
  }

  @Post(':knowledgeBaseId/records/:recordId/transcribe')
  @ApiOperation({ summary: '使用 DashScope Fun-ASR 转写真实面试录音' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  @ApiParam({ name: 'recordId', description: '真实面试录音记录 id' })
  transcribeAudioRecord(
    @CurrentUser() user: AuthUser,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('recordId') recordId: string,
    @Body() body: TranscribeAudioRecordDto,
  ) {
    return this.knowledgeBasesService.transcribeAudioRecord(user.id, knowledgeBaseId, recordId, body);
  }

  @Post(':knowledgeBaseId/records/:recordId/build')
  @ApiOperation({ summary: '使用 DeepSeek 构建真实面试知识库记录' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  @ApiParam({ name: 'recordId', description: '真实面试记录 id' })
  buildRecord(
    @CurrentUser() user: AuthUser,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.knowledgeBasesService.buildRecord(user.id, knowledgeBaseId, recordId);
  }

  @Delete(':knowledgeBaseId/records/:recordId')
  @ApiOperation({ summary: '删除真实面试知识库中的单条面试记录' })
  @ApiParam({ name: 'knowledgeBaseId', description: '知识库 id' })
  @ApiParam({ name: 'recordId', description: '真实面试记录 id' })
  removeRecord(
    @CurrentUser() user: AuthUser,
    @Param('knowledgeBaseId') knowledgeBaseId: string,
    @Param('recordId') recordId: string,
  ) {
    return this.knowledgeBasesService.removeRecord(user.id, knowledgeBaseId, recordId);
  }
}
