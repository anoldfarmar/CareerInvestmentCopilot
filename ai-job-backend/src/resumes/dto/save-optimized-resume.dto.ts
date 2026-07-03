import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { SaveStructuredResumeDto } from './save-structured-resume.dto';

export class ResumeSummaryDto {
  @IsString({ message: 'overview.resumeSummary.headline 必须是字符串' })
  headline!: string;

  @IsArray({ message: 'overview.resumeSummary.highlights 必须是数组' })
  @IsString({ each: true, message: 'overview.resumeSummary.highlights 必须是字符串数组' })
  highlights!: string[];

  @IsArray({ message: 'overview.resumeSummary.risks 必须是数组' })
  @IsString({ each: true, message: 'overview.resumeSummary.risks 必须是字符串数组' })
  risks!: string[];
}

export class RolePersonaDto {
  @IsString({ message: 'overview.rolePersonas.role 必须是字符串' })
  role!: string;

  @IsString({ message: 'overview.rolePersonas.fitReason 必须是字符串' })
  fitReason!: string;

  @IsString({ message: 'overview.rolePersonas.bestScene 必须是字符串' })
  bestScene!: string;

  @IsString({ message: 'overview.rolePersonas.gapTip 必须是字符串' })
  gapTip!: string;
}

export class ResumeOptimizationOverviewDto {
  @ValidateNested()
  @Type(() => ResumeSummaryDto)
  resumeSummary!: ResumeSummaryDto;

  @IsArray({ message: 'overview.rolePersonas 必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => RolePersonaDto)
  rolePersonas!: RolePersonaDto[];
}

export class SuggestionLocationDto {
  @IsIn(
    ['basicInfo', 'summary', 'skills', 'workExperiences', 'projects', 'educations'],
    { message: 'suggestion.location.section 不在约定范围内' },
  )
  section!: string;

  @IsOptional()
  @IsInt({ message: 'suggestion.location.itemIndex 必须是整数' })
  @Min(0, { message: 'suggestion.location.itemIndex 不能小于 0' })
  itemIndex?: number;
}

export class ResumeOptimizationSuggestionDto {
  @IsString({ message: 'suggestion.id 必须是字符串' })
  id!: string;

  @IsInt({ message: 'suggestion.priority 必须是整数' })
  @Min(1, { message: 'suggestion.priority 不能小于 1' })
  priority!: number;

  @IsIn(
    [
      'missing_info',
      'structure_issue',
      'wording_issue',
      'redundancy',
      'inconsistent_format',
      'timeline_issue',
      'low_signal_content',
      'privacy_risk',
      'jd_alignment',
      'keyword_optimization',
      'cross_section_issue',
      'other',
    ],
    { message: 'suggestion.issueType 不在约定范围内' },
  )
  issueType!: string;

  @ValidateNested()
  @Type(() => SuggestionLocationDto)
  location!: SuggestionLocationDto;

  @IsString({ message: 'suggestion.problem 必须是字符串' })
  problem!: string;

  @IsString({ message: 'suggestion.original 必须是字符串' })
  original!: string;

  @IsString({ message: 'suggestion.suggestion 必须是字符串' })
  suggestion!: string;

  @IsOptional()
  @IsNumber({}, { message: 'suggestion.jdRelevanceScore 必须是数字' })
  jdRelevanceScore?: number;
}

export class ResumeOptimizationSectionDto {
  @IsIn(
    ['basicInfo', 'summary', 'skills', 'workExperiences', 'projects', 'educations'],
    { message: 'suggestionSections.section 不在约定范围内' },
  )
  section!: string;

  @IsArray({ message: 'suggestionSections.suggestions 必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ResumeOptimizationSuggestionDto)
  suggestions!: ResumeOptimizationSuggestionDto[];
}

export class ResumeOptimizationJobSnapshotDto {
  @IsOptional()
  @IsString({ message: 'jobSnapshot.targetRole 必须是字符串' })
  targetRole?: string;

  @IsOptional()
  @IsString({ message: 'jobSnapshot.jobDescription 必须是字符串' })
  jobDescription?: string;
}

// 优化结果不会覆盖原始结构化简历，而是单独保存一份优化稿。
// optimizationNotes 用于告诉用户模型具体调整了什么。
export class SaveOptimizedResumeDto {
  @ApiProperty({
    type: SaveStructuredResumeDto,
    description: '优化后的完整结构化简历',
  })
  @ValidateNested()
  @Type(() => SaveStructuredResumeDto)
  optimizedResume!: SaveStructuredResumeDto;

  @ApiProperty({
    description: '本次优化的修改摘要',
    example: ['强化了个人总结中的岗位匹配度', '将工作经历改写为更清晰的成果表达'],
  })
  @IsArray({ message: 'optimizationNotes 必须是数组' })
  @IsString({
    each: true,
    message: 'optimizationNotes 中的每一项都必须是字符串',
  })
  optimizationNotes!: string[];

  @ApiProperty({
    required: false,
    description: '参考 exp-JDresume 的简历概览画像，用于前端展示定位、亮点和风险。',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeOptimizationOverviewDto)
  overview?: ResumeOptimizationOverviewDto;

  @ApiProperty({
    required: false,
    description: '参考 exp-JDresume 的分模块优化建议，用于展示问题、原文和建议。',
  })
  @IsOptional()
  @IsArray({ message: 'suggestionSections 必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ResumeOptimizationSectionDto)
  suggestionSections?: ResumeOptimizationSectionDto[];

  @ApiProperty({
    required: false,
    description: '本次优化对应的岗位/JD快照，用于历史记录回看。',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ResumeOptimizationJobSnapshotDto)
  jobSnapshot?: ResumeOptimizationJobSnapshotDto;

  @ApiProperty({
    required: false,
    description: '本次优化对应的 JD 匹配度报告。',
  })
  @IsOptional()
  @IsObject({ message: 'jdMatchResult 必须是对象' })
  jdMatchResult?: Record<string, unknown>;
}
