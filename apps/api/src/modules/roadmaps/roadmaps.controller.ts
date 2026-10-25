import { Controller, Get, Delete, Patch, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoadmapsService } from './roadmaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

class UpdateTaskDto {
  @IsString() milestoneId: string;
  @IsString() taskId: string;
  // Use the raw value so "yes"/"false" strings aren't silently coerced by implicit conversion
  @Transform(({ obj }) => obj.completed)
  @IsBoolean()
  completed: boolean;
}

@ApiTags('roadmaps')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('roadmaps')
export class RoadmapsController {
  constructor(private readonly service: RoadmapsService) {}

  @Get()
  @ApiOperation({ summary: 'List all roadmaps' })
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get roadmap details with milestones' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Patch(':id/task')
  @ApiOperation({ summary: 'Mark a task complete/incomplete' })
  updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.service.updateMilestoneTask(id, userId, dto.milestoneId, dto.taskId, dto.completed);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete roadmap' })
  delete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }
}
