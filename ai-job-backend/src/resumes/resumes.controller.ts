import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateResumeDto } from './dto/create-resume.dto';
import { OptimizeResumeDto } from './dto/optimize-resume.dto';
import { SaveOptimizedResumeDto } from './dto/save-optimized-resume.dto';
import { SaveStructuredResumeDto } from './dto/save-structured-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResumesService } from './resumes.service';
import { normalizeUploadFilename } from './utils/normalize-upload-filename';

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
  // 当前只验证上传链路，不会将文件写入磁盘或数据库。
  @Post('upload')
  @ApiOperation({ summary: '上传简历文件，暂不解析正文' })
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
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType:
            /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/,
        })
        .addMaxSizeValidator({
          maxSize: 5 * 1024 * 1024,
        })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    // 仅返回元信息，用于确认后端已经正确收到文件。
    return {
      originalName: normalizeUploadFilename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
    };
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
    const filename = normalizeUploadFilename(file.originalname);
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
    return this.resumesService.optimizeWithAi(user.id, id, body.jobDescription);
  }

  // GET /resumes 类似前端进入简历管理页时加载列表。
  @Get()
  @ApiOperation({ summary: '查询简历列表' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.resumesService.findAll(user.id);
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
