import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';
import { MarketStatsService } from './market-stats.service';

@Module({
  controllers: [MarketController],
  providers: [MarketService, MarketStatsService],
})
export class MarketModule {}
