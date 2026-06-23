import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { JOB_STATUSES } from '../job-status';

export class CreateJobDto {
  // 岗位名称，类似前端岗位卡片的主标题。
  @ApiProperty({
    description: '岗位名称',
    example: '前端工程师',
  })
  @IsString({ message: 'title 必须是字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  @MaxLength(120, { message: 'title 最多只能包含 120 个字符' })
  title!: string;

  // 公司名不是所有 JD 都能第一时间拿到，所以允许为空。
  @ApiPropertyOptional({
    description: '公司名称',
    example: '示例科技有限公司',
  })
  @IsOptional()
  @IsString({ message: 'company 必须是字符串' })
  @MaxLength(120, { message: 'company 最多只能包含 120 个字符' })
  company?: string;

  // 完整 JD 文本，后续会用于大模型做岗位匹配和定向优化。
  @ApiProperty({
    description: '岗位 JD 原文',
    example: '岗位职责：负责前端工程化、业务组件开发和性能优化。',
  })
  @IsString({ message: 'description 必须是字符串' })
  @IsNotEmpty({ message: 'description 不能为空' })
  @MaxLength(30000, { message: 'description 最多只能包含 30000 个字符' })
  description!: string;

  @ApiPropertyOptional({
    description: '招聘链接或来源地址',
    example: 'https://example.com/jobs/123',
  })
  @IsOptional()
  @IsUrl({}, { message: 'sourceUrl 必须是合法 URL' })
  @MaxLength(500, { message: 'sourceUrl 最多只能包含 500 个字符' })
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: '薪资范围或待遇备注',
    example: '25k - 35k * 15薪',
  })
  @IsOptional()
  @IsString({ message: 'salary 必须是字符串' })
  @MaxLength(120, { message: 'salary 最多只能包含 120 个字符' })
  salary?: string;

  @ApiPropertyOptional({
    description: '工作城市或办公地点',
    example: '上海 · 浦东新区',
  })
  @IsOptional()
  @IsString({ message: 'location 必须是字符串' })
  @MaxLength(120, { message: 'location 最多只能包含 120 个字符' })
  location?: string;

  @ApiPropertyOptional({
    description: '投递备注',
    example: '内推已提交，等待一面排期。',
  })
  @IsOptional()
  @IsString({ message: 'notes 必须是字符串' })
  @MaxLength(2000, { message: 'notes 最多只能包含 2000 个字符' })
  notes?: string;

  @ApiPropertyOptional({
    description: '投递优先级',
    enum: ['normal', 'urgent'],
    example: 'normal',
  })
  @IsOptional()
  @IsIn(['normal', 'urgent'], { message: 'priority 必须是 normal 或 urgent' })
  priority?: string;

  @ApiPropertyOptional({
    description: '岗位状态',
    enum: JOB_STATUSES,
    example: 'draft',
  })
  @IsOptional()
  @IsIn(JOB_STATUSES, { message: 'status 必须是约定的岗位状态' })
  status?: string;
}
