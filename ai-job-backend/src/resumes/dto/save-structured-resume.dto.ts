import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// 基本信息类似前端简历表单顶部的个人资料区域。
export class ResumeBasicInfoDto {
  @ApiPropertyOptional({ description: '姓名', example: '小明' })
  @IsOptional()
  @IsString({ message: 'basicInfo.name 必须是字符串' })
  name?: string;

  @ApiPropertyOptional({ description: '手机号', example: '13800000000' })
  @IsOptional()
  @IsString({ message: 'basicInfo.phone 必须是字符串' })
  phone?: string;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'xiaoming@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'basicInfo.email 必须是合法的邮箱地址' })
  email?: string;
}

// 工作经历类似前端表单中的可重复卡片列表。
export class WorkExperienceDto {
  @ApiProperty({ description: '公司名称', example: '示例科技有限公司' })
  @IsString({ message: 'workExperiences.company 必须是字符串' })
  company!: string;

  @ApiProperty({ description: '职位名称', example: '前端工程师' })
  @IsString({ message: 'workExperiences.position 必须是字符串' })
  position!: string;

  @ApiPropertyOptional({ description: '开始时间', example: '2023-01' })
  @IsOptional()
  @IsString({ message: 'workExperiences.startDate 必须是字符串' })
  startDate?: string;

  @ApiPropertyOptional({ description: '结束时间', example: '2025-01' })
  @IsOptional()
  @IsString({ message: 'workExperiences.endDate 必须是字符串' })
  endDate?: string;

  @ApiPropertyOptional({
    description: '工作内容',
    example: '负责后台管理系统和组件库建设。',
  })
  @IsOptional()
  @IsString({ message: 'workExperiences.description 必须是字符串' })
  description?: string;
}

export class ProjectExperienceDto {
  @ApiProperty({ description: '项目名称', example: 'AI 求职助手' })
  @IsString({ message: 'projects.name 必须是字符串' })
  name!: string;

  @ApiPropertyOptional({
    description: '项目描述',
    example: '基于 NestJS 和 PostgreSQL 的求职助手。',
  })
  @IsOptional()
  @IsString({ message: 'projects.description 必须是字符串' })
  description?: string;
}

export class EducationDto {
  @ApiProperty({ description: '学校名称', example: '示例大学' })
  @IsString({ message: 'educations.school 必须是字符串' })
  school!: string;

  @ApiPropertyOptional({ description: '专业', example: '计算机科学与技术' })
  @IsOptional()
  @IsString({ message: 'educations.major 必须是字符串' })
  major?: string;

  @ApiPropertyOptional({ description: '学历', example: '本科' })
  @IsOptional()
  @IsString({ message: 'educations.degree 必须是字符串' })
  degree?: string;
}

// 这是未来要求大模型输出的统一 JSON 形状。
export class SaveStructuredResumeDto {
  @ApiPropertyOptional({ type: ResumeBasicInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeBasicInfoDto)
  basicInfo?: ResumeBasicInfoDto;

  @ApiPropertyOptional({ description: '个人总结', example: '3 年前端开发经验。' })
  @IsOptional()
  @IsString({ message: 'summary 必须是字符串' })
  summary?: string;

  @ApiPropertyOptional({
    description: '技能列表',
    example: ['Vue', 'React', 'TypeScript'],
  })
  @IsOptional()
  @IsArray({ message: 'skills 必须是数组' })
  @IsString({ each: true, message: 'skills 中的每一项都必须是字符串' })
  skills?: string[];

  @ApiPropertyOptional({ type: [WorkExperienceDto] })
  @IsOptional()
  @IsArray({ message: 'workExperiences 必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  workExperiences?: WorkExperienceDto[];

  @ApiPropertyOptional({ type: [ProjectExperienceDto] })
  @IsOptional()
  @IsArray({ message: 'projects 必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ProjectExperienceDto)
  projects?: ProjectExperienceDto[];

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsOptional()
  @IsArray({ message: 'educations 必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  educations?: EducationDto[];
}
