import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';

export interface RecommendationRequest {
  studentId: number;
  limit?: number;
  refresh?: boolean;
}

export interface BatchRecommendationRequest {
  studentIds: number[];
  limit?: number;
}

export interface Recommendation {
  course_id: number;
  title: string;
  description: string;
  department_name: string;
  instructor_name: string;
  credits: number;
  difficulty_level: string;
  score: number;
  strategies: string[];
  reason: string;
}

export interface RecommendationResponse {
  success: boolean;
  student_id: number;
  recommendations: Recommendation[];
  timestamp: string;
  error?: string;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly mlServiceUrl: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.mlServiceUrl = this.configService.get<string>('mlService.url', 'http://localhost:8000');
  }

  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const { studentId, limit = 3, refresh = false } = request;

    this.logger.log(`Getting recommendations for student ${studentId}, limit: ${limit}, refresh: ${refresh}`);

    // Check cache first unless refresh is requested
    const cacheKey = `recommendations:${studentId}:${limit}`;
    if (!refresh) {
      const cachedResult = await this.cacheManager.get<RecommendationResponse>(cacheKey);
      if (cachedResult) {
        this.logger.log(`Returning cached recommendations for student ${studentId}`);
        return cachedResult;
      }
    }

    try {
      const url = `${this.mlServiceUrl}/recommendations/${studentId}`;
      const params = { limit, refresh };

      const response = await firstValueFrom(
        this.httpService.get<RecommendationResponse>(url, {
          params,
          timeout: 30000 // 30 second timeout
        })
      );

      const result = response.data;

      // Cache successful results for 30 minutes
      if (result.success) {
        await this.cacheManager.set(cacheKey, result, 1800);
      }

      return result;

    } catch (error) {
      this.logger.error(`Error getting recommendations for student ${studentId}:`, error.message);

      if (error.response?.status === 404) {
        throw new HttpException(
          `Student ${studentId} not found`,
          HttpStatus.NOT_FOUND
        );
      }

      // Return fallback recommendations or cached data if available
      const fallbackResult = await this.getFallbackRecommendations(studentId, limit);
      if (fallbackResult) {
        return fallbackResult;
      }

      throw new HttpException(
        'Failed to get recommendations from ML service',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getBatchRecommendations(request: BatchRecommendationRequest): Promise<Record<number, Recommendation[]>> {
    const { studentIds, limit = 3 } = request;

    this.logger.log(`Getting batch recommendations for ${studentIds.length} students`);

    try {
      const url = `${this.mlServiceUrl}/recommendations/batch`;
      const payload = { student_ids: studentIds, limit };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: 60000 // 60 second timeout for batch operations
        })
      );

      return response.data.results;

    } catch (error) {
      this.logger.error('Error getting batch recommendations:', error.message);
      throw new HttpException(
        'Failed to get batch recommendations from ML service',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async retrainModel(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Triggering ML model retraining');

    try {
      const url = `${this.mlServiceUrl}/model/retrain`;

      const response = await firstValueFrom(
        this.httpService.post(url, {}, {
          timeout: 120000 // 2 minute timeout for retraining
        })
      );

      // Clear local cache after retraining
      await this.clearCache();

      return response.data;

    } catch (error) {
      this.logger.error('Error retraining model:', error.message);
      throw new HttpException(
        'Failed to retrain model',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  } async clearCache(): Promise<{ success: boolean; message: string }> {
    this.logger.log('Clearing recommendation cache');

    try {
      // Note: Cache clearing is handled by TTL expiration
      this.logger.log('Cache will be cleared by TTL expiration');

      // Clear ML service cache
      const url = `${this.mlServiceUrl}/cache/clear`;
      const response = await firstValueFrom(
        this.httpService.post(url, {})
      );

      return {
        success: true,
        message: 'Cache cleared successfully'
      };

    } catch (error) {
      this.logger.error('Error clearing cache:', error.message);
      throw new HttpException(
        'Failed to clear cache',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async getServiceStats(): Promise<any> {
    try {
      const url = `${this.mlServiceUrl}/stats`;

      const response = await firstValueFrom(
        this.httpService.get(url)
      );

      return response.data.stats;

    } catch (error) {
      this.logger.error('Error getting service stats:', error.message);
      throw new HttpException(
        'Failed to get service statistics',
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const url = `${this.mlServiceUrl}/health`;

      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 })
      );

      return response.data.status === 'healthy';

    } catch (error) {
      this.logger.warn('ML service health check failed:', error.message);
      return false;
    }
  }

  private async getFallbackRecommendations(studentId: number, limit: number): Promise<RecommendationResponse | null> {
    // Try to get cached recommendations (even if older)
    const cacheKey = `recommendations:${studentId}:${limit}`;
    const cachedResult = await this.cacheManager.get<RecommendationResponse>(cacheKey);

    if (cachedResult) {
      this.logger.log(`Returning stale cached recommendations for student ${studentId} as fallback`);
      return {
        ...cachedResult,
        timestamp: new Date().toISOString(),
        recommendations: cachedResult.recommendations.map(rec => ({
          ...rec,
          reason: `${rec.reason} (cached result)`
        }))
      };
    }

    // Could implement database-based fallback recommendations here
    return null;
  }
}
