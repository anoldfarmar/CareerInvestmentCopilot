import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class RecommendJobsDto {
  @ApiPropertyOptional({
    description: '目标岗位关键词，留空时会从个人资料和最近简历中推断',
    example: ['数据分析实习', 'AI 应用开发实习'],
  })
  @IsOptional()
  @IsArray({ message: 'targetRoles 必须是数组' })
  @ArrayMaxSize(8, { message: 'targetRoles 最多 8 项' })
  @IsString({ each: true, message: 'targetRoles 每一项都必须是字符串' })
  targetRoles?: string[];

  @ApiPropertyOptional({
    description: '目标城市',
    example: ['深圳', '广州', '远程'],
  })
  @IsOptional()
  @IsArray({ message: 'cities 必须是数组' })
  @ArrayMaxSize(8, { message: 'cities 最多 8 项' })
  @IsString({ each: true, message: 'cities 每一项都必须是字符串' })
  cities?: string[];

  @ApiPropertyOptional({
    description: '技能关键词',
    example: ['Python', 'SQL', 'LLM', 'Agent'],
  })
  @IsOptional()
  @IsArray({ message: 'skills 必须是数组' })
  @ArrayMaxSize(12, { message: 'skills 最多 12 项' })
  @IsString({ each: true, message: 'skills 每一项都必须是字符串' })
  skills?: string[];

  @ApiPropertyOptional({
    description: '到岗时间/求职类型',
    example: '实习 可尽快到岗',
  })
  @IsOptional()
  @IsString({ message: 'availability 必须是字符串' })
  @MaxLength(80, { message: 'availability 最多 80 个字符' })
  availability?: string;

  @ApiPropertyOptional({
    description: '搜索范围',
    enum: ['fast', 'standard', 'broad'],
    example: 'standard',
  })
  @IsOptional()
  @IsIn(['fast', 'standard', 'broad'], { message: 'mode 必须是 fast、standard 或 broad' })
  mode?: 'fast' | 'standard' | 'broad';

  @ApiPropertyOptional({
    description: '返回数量',
    example: 18,
  })
  @IsOptional()
  @IsInt({ message: 'maxResults 必须是整数' })
  @Min(1, { message: 'maxResults 至少为 1' })
  @Max(40, { message: 'maxResults 最多为 40' })
  maxResults?: number;

  @ApiPropertyOptional({
    description: '额外简历/求职画像文本',
    example: '本科计算机，做过 Agent 评测和数据分析项目。',
  })
  @IsOptional()
  @IsString({ message: 'profile 必须是字符串' })
  @MaxLength(3000, { message: 'profile 最多 3000 个字符' })
  profile?: string;
}
