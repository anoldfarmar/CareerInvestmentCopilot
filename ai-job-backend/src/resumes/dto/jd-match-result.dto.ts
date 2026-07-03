import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class JdCategoryScoresDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  mustHave = 0;

  @IsNumber()
  @Min(0)
  @Max(1)
  niceToHave = 0;

  @IsNumber()
  @Min(0)
  @Max(1)
  degree = 0;

  @IsNumber()
  @Min(0)
  @Max(1)
  experience = 0;

  @IsNumber()
  @Min(0)
  @Max(1)
  techStack = 0;

  @IsNumber()
  @Min(0)
  @Max(1)
  jobDuties = 0;
}

export class JdMatchSummaryDto {
  @IsNumber()
  totalScore = 0;

  @IsNumber()
  maxScore = 0;

  @IsNumber()
  @Min(0)
  @Max(1)
  percent = 0;

  @ValidateNested()
  @Type(() => JdCategoryScoresDto)
  byCategory = new JdCategoryScoresDto();
}

export class JdRequirementDto {
  @IsString()
  id = '';

  @IsString()
  category = '';

  @IsString()
  text = '';
}

export class JdRequirementMatchDto {
  @IsString()
  requirementId = '';

  @IsString()
  requirementText = '';

  @IsString()
  category = '';

  @IsNumber()
  @Min(0)
  @Max(1)
  score = 0;

  @IsArray()
  @IsString({ each: true })
  evidence: string[] = [];

  @IsString()
  rationale = '';

  @IsOptional()
  @IsObject()
  correction?: Record<string, unknown>;
}

export class JdMatchResultDto {
  @ValidateNested()
  @Type(() => JdMatchSummaryDto)
  summary = new JdMatchSummaryDto();

  @IsString()
  headline = '';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JdRequirementMatchDto)
  matches: JdRequirementMatchDto[] = [];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JdRequirementDto)
  gaps: JdRequirementDto[] = [];
}
