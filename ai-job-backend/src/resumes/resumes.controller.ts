import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationQueryDto } from '../common/pagination/pagination-query.dto';
import { AnalyzeResumeMatchDto } from './dto/analyze-resume-match.dto';
import { CreateResumeDto } from './dto/create-resume.dto';
import { FinalizeResumeDto } from './dto/finalize-resume.dto';
import { OptimizeResumeDto } from './dto/optimize-resume.dto';
import { SaveOptimizedResumeDto } from './dto/save-optimized-resume.dto';
import { SaveResumeDraftDto } from './dto/save-resume-draft.dto';
import { SaveStructuredResumeDto } from './dto/save-structured-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResumesService } from './resumes.service';
import { normalizeResumePdfTemplate } from './pdf-templates';
import { assertResumeFile } from './utils/validate-resume-upload';

// 将简历接口归类到 Swagger 页面中的 resumes 分组。
@ApiTags('resumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  // POST /resumes 类似前端提交简历编辑表单。
  @Post()
  @ApiOperation({ summary: '创建简历' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateResumeDto) {
    return this.resumesService.create(user.id, body);
  }

  // POST /resumes/upload 类似前端使用 FormData 上传文件。
  // 上传后会保存到服务器用户目录，并创建简历资产记录。
  @Post('upload')
  @ApiOperation({ summary: '上传简历文件，保存原文件并自动提交解析任务' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '支持 PDF、DOC、DOCX，最大 5 MB',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/markdown|text\/plain|application\/octet-stream)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    const filename = assertResumeFile(file, 'preview');
    return this.resumesService.uploadResumeFile(user.id, file, filename);
  }

  // POST /resumes/:id/parse/upload 将文件交给 MinerU 异步解析。
  @Post(':id/parse/upload')
  @ApiOperation({ summary: '上传简历文件并创建 MinerU 解析任务' })
  @ApiParam({ name: 'id', description: '需要绑定解析任务的简历 id', example: 1 })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '支持 PDF、DOCX，最大 10 MB',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  parseUpload(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /^(application\/pdf|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    const filename = assertResumeFile(file, 'parse');
    return this.resumesService.submitParseTask(user.id, id, file, filename);
  }

  // GET /resumes/:id/parse 查询进度，并将最新结果同步进数据库。
  @Get(':id/parse')
  @ApiOperation({ summary: '查询 MinerU 解析状态并保存 Markdown 结果' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  getParseTask(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.resumesService.syncParseTask(user.id, id);
  }

  // POST /resumes/:id/structure 调用 DeepSeek，将 Markdown 转为结构化 JSON。
  @Post(':id/structure')
  @ApiOperation({ summary: '使用 DeepSeek 结构化简历 Markdown' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  structureWithAi(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.resumesService.structureWithAi(user.id, id);
  }

  // PUT /resumes/:id/structured-content 保存经过校验的结构化简历。
  @Put(':id/structured-content')
  @ApiOperation({ summary: '保存结构化简历 JSON' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  saveStructuredContent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveStructuredResumeDto,
  ) {
    return this.resumesService.saveStructuredContent(user.id, id, body);
  }

  // PUT /resumes/:id/optimized-content 保存经过校验的优化稿。
  @Put(':id/optimized-content')
  @ApiOperation({ summary: '保存优化后的结构化简历 JSON' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  saveOptimizedContent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveOptimizedResumeDto,
  ) {
    return this.resumesService.saveOptimizedContent(user.id, id, body);
  }

  @Put(':id/draft-content')
  @ApiOperation({ summary: '自动保存当前正在编辑的优化稿草稿' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  saveDraftContent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SaveResumeDraftDto,
  ) {
    return this.resumesService.saveDraftContent(user.id, id, body);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: '将当前优化稿确认为最终版' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  finalizeResume(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: FinalizeResumeDto,
  ) {
    return this.resumesService.finalizeResume(user.id, id, body);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '查询简历优化稿历史版本' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  findVersions(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.resumesService.findVersions(user.id, id);
  }

  // POST /resumes/:id/optimize 使用 DeepSeek 生成优化稿。
  // jobDescription 可选：不填时做通用优化，填写时做 JD 定向优化。
  @Post(':id/optimize')
  @ApiOperation({ summary: '使用 DeepSeek 优化结构化简历，支持可选 JD' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  optimizeWithAi(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OptimizeResumeDto,
  ) {
    return this.resumesService.optimizeWithAi(
      user.id,
      id,
      body.jobDescription,
      body.additionalInstruction,
    );
  }

  @Post(':id/jd-match')
  @ApiOperation({ summary: '计算简历与目标 JD 的真实匹配度，并返回缺失关键词和扣分原因' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  analyzeJdMatch(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AnalyzeResumeMatchDto,
  ) {
    return this.resumesService.analyzeJdMatch(user.id, id, body.jobDescription);
  }

  // POST /resumes/:id/export/pdf 将当前优化稿打印成 PDF 文件。
  @Post(':id/export/pdf')
  @ApiOperation({ summary: '导出 PDF 简历，支持 classic / modern / sidebar 模板' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  @ApiQuery({
    name: 'template',
    required: false,
    enum: ['classic', 'modern', 'sidebar', 'kendall', 'even'],
    description:
      'PDF 模板名称：classic=经典单栏，modern=现代卡片，sidebar=左侧栏，kendall=头像居中经典风，even=扁平清爽风。留空默认 classic。',
    example: 'classic',
  })
  @ApiQuery({
    name: 'versionId',
    required: false,
    description: '可选：指定历史优化稿版本 id；不传则导出当前最终版/优化稿/结构化简历',
    example: 1,
  })
  @ApiProduces('application/pdf')
  @HttpCode(200)
  @ApiOkResponse({
    description: '返回 PDF 文件',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportPdf(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('template') templateName: string | undefined,
    @Query('versionId') versionIdValue: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const template = normalizeResumePdfTemplate(templateName);
    const versionId = versionIdValue ? Number(versionIdValue) : undefined;
    const pdf = await this.resumesService.exportPdf(user.id, id, template, versionId);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="resume-${id}-${template}.pdf"`,
      'Content-Length': pdf.length,
    });

    return new StreamableFile(pdf);
  }

  @Get(':id/export/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @ApiOperation({ summary: '预览指定模板和版本的 HTML 简历效果' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  @ApiQuery({
    name: 'template',
    required: false,
    enum: ['classic', 'modern', 'sidebar', 'kendall', 'even'],
    description: '模板名称',
    example: 'classic',
  })
  @ApiQuery({
    name: 'versionId',
    required: false,
    description: '可选：指定历史优化稿版本 id',
    example: 1,
  })
  previewPdfHtml(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Query('template') templateName: string | undefined,
    @Query('versionId') versionIdValue: string | undefined,
  ) {
    const template = normalizeResumePdfTemplate(templateName);
    const versionId = versionIdValue ? Number(versionIdValue) : undefined;
    return this.resumesService.previewPdfHtml(user.id, id, template, versionId);
  }

  @Get(':id/exports')
  @ApiOperation({ summary: '查询简历历史 PDF 导出记录' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  findExports(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.resumesService.findExports(user.id, id);
  }

  @Delete(':id/exports/:exportId')
  @ApiOperation({ summary: '删除某条 PDF 导出记录和本地缓存文件' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  @ApiParam({ name: 'exportId', description: '导出记录 id', example: 1 })
  removeExport(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('exportId', ParseIntPipe) exportId: number,
  ) {
    return this.resumesService.removeExport(user.id, id, exportId);
  }

  // GET /resumes 类似前端进入简历管理页时加载列表。
  @Get()
  @ApiOperation({ summary: '查询简历列表' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.resumesService.findAll(user.id, query);
  }

  // GET /resumes/:id 类似前端进入某份简历的编辑页。
  @Get(':id')
  @ApiOperation({ summary: '根据 id 查询简历详情' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.resumesService.findOne(user.id, id);
  }

  // PATCH /resumes/:id 类似前端保存简历编辑器中的修改。
  @Patch(':id')
  @ApiOperation({ summary: '根据 id 修改简历' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateResumeDto,
  ) {
    return this.resumesService.update(user.id, id, body);
  }

  // DELETE /resumes/:id 类似前端简历列表页点击删除按钮。
  @Delete(':id')
  @ApiOperation({ summary: '根据 id 删除简历' })
  @ApiParam({ name: 'id', description: '简历 id', example: 1 })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.resumesService.remove(user.id, id);
  }
}
