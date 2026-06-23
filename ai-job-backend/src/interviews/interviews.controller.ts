import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddInterviewQuestionDto } from './dto/add-interview-question.dto';
import { CreateInterviewSessionDto } from './dto/create-interview-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { SubmitQuestionFeedbackDto } from './dto/submit-question-feedback.dto';
import { InterviewsService } from './interviews.service';

@ApiTags('interviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post('sessions')
  @ApiOperation({ summary: '创建模拟面试会话' })
  createSession(@CurrentUser() user: AuthUser, @Body() body: CreateInterviewSessionDto) {
    return this.interviewsService.createSession(user.id, body);
  }

  @Get('sessions/active/latest')
  @ApiOperation({ summary: '查询最近一场未结束的模拟面试，用于断点续做' })
  findLatestActiveSession(@CurrentUser() user: AuthUser) {
    return this.interviewsService.findLatestActiveSession(user.id);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: '查询模拟面试会话' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  findSession(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.interviewsService.findSession(user.id, sessionId);
  }

  @Post('sessions/:sessionId/questions')
  @ApiOperation({ summary: '在题目预览阶段追加一道面试题' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  addQuestion(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() body: AddInterviewQuestionDto,
  ) {
    return this.interviewsService.addQuestion(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/questions/:questionId/skip')
  @ApiOperation({ summary: '在题目预览阶段跳过一道不想回答的题' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  @ApiParam({ name: 'questionId', description: '题目 id' })
  skipQuestion(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
  ) {
    return this.interviewsService.skipQuestion(user.id, sessionId, questionId);
  }

  @Post('sessions/:sessionId/questions/:questionId/feedback')
  @ApiOperation({ summary: '提交单道面试题的难度、相关性和重复度反馈' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  @ApiParam({ name: 'questionId', description: '题目 id' })
  submitQuestionFeedback(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
    @Body() body: SubmitQuestionFeedbackDto,
  ) {
    return this.interviewsService.submitQuestionFeedback(user.id, sessionId, questionId, body);
  }

  @Post('sessions/:sessionId/answer')
  @ApiOperation({ summary: '提交一轮模拟面试回答' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  submitAnswer(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() body: SubmitAnswerDto,
  ) {
    return this.interviewsService.submitAnswer(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/next-question')
  @ApiOperation({ summary: '进入下一道模拟面试题' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  moveToNextQuestion(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.interviewsService.moveToNextQuestion(user.id, sessionId);
  }

  @Post('sessions/:sessionId/end')
  @ApiOperation({ summary: '结束模拟面试会话' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  endSession(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.interviewsService.endSession(user.id, sessionId);
  }

  @Get('sessions/:sessionId/progress')
  @ApiOperation({ summary: '查询模拟面试进度' })
  @ApiParam({ name: 'sessionId', description: '面试会话 id' })
  getProgress(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.interviewsService.getProgress(user.id, sessionId);
  }
}
