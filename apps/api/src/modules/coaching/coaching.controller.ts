import { Controller, Get, Post, Delete, Body, Param, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CoachingService } from './coaching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiThrottle } from '../../common/throttle/ai-throttle';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsOptional, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

class StartSessionDto {
  @IsString() @IsNotEmpty() @MaxLength(4000) message: string;
  @IsOptional() @IsUUID() analysisId?: string;
}

class ContinueSessionDto {
  @IsString() @IsNotEmpty() @MaxLength(4000) message: string;
}

@ApiTags('coaching')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('coaching')
export class CoachingController {
  constructor(private readonly service: CoachingService) {}

  @Post('sessions')
  @AiThrottle()
  @ApiOperation({ summary: 'Start a new coaching session' })
  startSession(@CurrentUser('id') userId: string, @Body() dto: StartSessionDto) {
    return this.service.startSession(userId, dto.message, dto.analysisId);
  }

  @Post('sessions/:id/messages')
  @AiThrottle()
  @ApiOperation({ summary: 'Continue a coaching session' })
  continueSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ContinueSessionDto,
  ) {
    return this.service.continueSession(id, userId, dto.message);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List coaching sessions' })
  getSessions(@CurrentUser('id') userId: string) {
    return this.service.getSessions(userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a coaching session with messages' })
  getSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.getSession(id, userId);
  }

  @Get('interview-questions')
  @AiThrottle()
  @ApiOperation({ summary: 'Generate interview questions for a job' })
  getInterviewQuestions(
    @CurrentUser('id') userId: string,
    @Query('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.service.getInterviewQuestions(userId, jobId);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete a coaching session' })
  deleteSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.deleteSession(id, userId);
  }
}
