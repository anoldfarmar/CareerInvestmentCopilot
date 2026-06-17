import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInterviewSessionDto {
  // 面试类型，和前端类型保持一致。
  @ApiProperty({
    description: '面试类型',
    enum: ['general', 'professional', 'behavioral', 'stress', 'english'],
    example: 'professional',
  })
  @IsIn(['general', 'professional', 'behavioral', 'stress', 'english'], {
    message: 'interviewType 不在约定范围内',
  })
  interviewType!: string;

  // 可选简历 id，后续用于结合简历出题。
  @ApiPropertyOptional({ description: '关联简历 id', example: 1 })
  @IsOptional()
  resumeId?: number | string;

  // 可选 JD，当前 MVP 用它辅助生成第一批问题。
  @ApiPropertyOptional({ description: '岗位 JD', example: '需要熟悉 React、TypeScript、工程化...' })
  @IsOptional()
  @IsString({ message: 'jobDescription 必须是字符串' })
  jobDescription?: string;

  // 可选知识库 id 列表，后续 RAG 会用到。
  @ApiPropertyOptional({ description: '知识库 id 列表', type: [String] })
  @IsOptional()
  @IsArray({ message: 'knowledgeBaseIds 必须是数组' })
  @IsString({ each: true, message: 'knowledgeBaseIds 每一项都必须是字符串' })
  knowledgeBaseIds?: string[];

  // 题目数量。
  @ApiProperty({ description: '题目数量', example: 5 })
  @IsInt({ message: 'questionCount 必须是整数' })
  @Min(1, { message: 'questionCount 至少为 1' })
  @Max(20, { message: 'questionCount 最多为 20' })
  questionCount!: number;

  // 是否启用追问。当前 MVP 会根据该字段调整提示语。
  @ApiPropertyOptional({ description: '是否启用追问', example: true })
  @IsOptional()
  @IsBoolean({ message: 'enableFollowUp 必须是布尔值' })
  enableFollowUp?: boolean;

  // 是否启用语音输入。当前主要给前端保留配置。
  @ApiPropertyOptional({ description: '是否启用语音输入', example: true })
  @IsOptional()
  @IsBoolean({ message: 'enableVoiceInput 必须是布尔值' })
  enableVoiceInput?: boolean;

  // 面试语言。
  @ApiPropertyOptional({ description: '面试语言', example: 'zh-CN' })
  @IsOptional()
  @IsString({ message: 'language 必须是字符串' })
  language?: string;
}
