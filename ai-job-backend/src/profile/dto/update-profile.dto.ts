import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: '用户昵称', example: '小明' })
  @IsOptional()
  @IsString({ message: 'name 必须是字符串' })
  @MaxLength(50, { message: 'name 最多 50 个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: '求职身份',
    enum: ['student', 'junior', 'mid', 'senior', 'career-switcher', 'entrepreneur'],
    example: 'junior',
  })
  @IsOptional()
  @IsIn(['student', 'junior', 'mid', 'senior', 'career-switcher', 'entrepreneur'], {
    message: 'jobMode 不在约定范围内',
  })
  jobMode?: string;

  @ApiPropertyOptional({ description: '主目标方向', example: 'internet' })
  @IsOptional()
  @IsString({ message: 'targetDirection 必须是字符串' })
  @MaxLength(80, { message: 'targetDirection 最多 80 个字符' })
  targetDirection?: string;

  @ApiPropertyOptional({
    description: '目标方向多选',
    type: [String],
    example: ['internet', 'finance'],
  })
  @IsOptional()
  @IsArray({ message: 'targetDirections 必须是数组' })
  @IsString({ each: true, message: 'targetDirections 每一项都必须是字符串' })
  targetDirections?: string[];

  @ApiPropertyOptional({ description: '自定义目标方向', example: 'AI 教育工具' })
  @IsOptional()
  @IsString({ message: 'customTargetDirection 必须是字符串' })
  @MaxLength(80, { message: 'customTargetDirection 最多 80 个字符' })
  customTargetDirection?: string;

  @ApiPropertyOptional({ description: '订阅版本', enum: ['free', 'premium'], example: 'free' })
  @IsOptional()
  @IsIn(['free', 'premium'], { message: 'subscriptionPlan 只能是 free 或 premium' })
  subscriptionPlan?: string;

  @ApiPropertyOptional({ description: '面试语言', example: 'zh-CN' })
  @IsOptional()
  @IsIn(['zh-CN', 'en-US'], { message: 'language 只能是 zh-CN 或 en-US' })
  language?: string;

  @ApiPropertyOptional({ description: '默认题目数量', example: 5 })
  @IsOptional()
  @IsInt({ message: 'questionCount 必须是整数' })
  @Min(1, { message: 'questionCount 至少为 1' })
  @Max(20, { message: 'questionCount 最多为 20' })
  questionCount?: number;

  @ApiPropertyOptional({ description: '是否启用语音输入', example: true })
  @IsOptional()
  @IsBoolean({ message: 'enableVoiceInput 必须是布尔值' })
  enableVoiceInput?: boolean;

  @ApiPropertyOptional({ description: '是否显示 STAR 提示卡片', example: true })
  @IsOptional()
  @IsBoolean({ message: 'showStarTips 必须是布尔值' })
  showStarTips?: boolean;
}
