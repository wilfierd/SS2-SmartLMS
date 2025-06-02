import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 3,
    }),
    CacheModule.register({
      ttl: 1800, // 30 minutes default TTL
      max: 1000, // Maximum number of items in cache
    }),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule { }
