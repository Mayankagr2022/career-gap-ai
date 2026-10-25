import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminAnalyticsService } from './admin-analytics.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AdminAnalyticsService],
  exports: [UsersService],
})
export class UsersModule {}
