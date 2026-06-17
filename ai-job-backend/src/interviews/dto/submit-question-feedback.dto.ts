import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class SubmitQuestionFeedbackDto {
  // 难度评分：用户觉得题目太简单/太难，都能帮助后续出题策略调整。
  @ApiProperty({ description: '难度评分，1 很简单，5 很难', example: 3 })
  @IsInt({ message: 'difficultyRating 必须是整数' })
  @Min(1, { message: 'difficultyRating 最小为 1' })
  @Max(5, { message: 'difficultyRating 最大为 5' })
  difficultyRating!: number;

  // 相关性评分：用于判断题目是否贴合简历、JD、知识库。
  @ApiProperty({ description: '相关性评分，1 不相关，5 很相关', example: 4 })
  @IsInt({ message: 'relevanceRating 必须是整数' })
  @Min(1, { message: 'relevanceRating 最小为 1' })
  @Max(5, { message: 'relevanceRating 最大为 5' })
  relevanceRating!: number;

  // 是否重复：后续可以用来降低同类题目重复率。
  @ApiPropertyOptional({ description: '是否觉得题目重复', example: false })
  @IsOptional()
  @IsBoolean({ message: 'isRepeated 必须是布尔值' })
  isRepeated?: boolean;

  // 用户开放反馈，先保存到 JSON，后续可以汇总成出题质量数据。
  @ApiPropertyOptional({ description: '补充反馈', example: '题目挺贴近 JD，但希望更偏项目深挖。' })
  @IsOptional()
  @IsString({ message: 'comment 必须是字符串' })
  @MaxLength(1000, { message: 'comment 最多 1000 个字符' })
  comment?: string;
}
