import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  Logger,
  Req,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RecommendationService, RecommendationRequest, BatchRecommendationRequest } from './recommendation.service';
import { GetRecommendationsDto, BatchRecommendationsDto } from './dto/recommendation.dto';

@ApiTags('recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(private readonly recommendationService: RecommendationService) { }

  // Endpoint cho current user - đặt trước :studentId để tránh conflict
  @Get()
  @ApiOperation({ summary: 'Get course recommendations for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved recommendations',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'ML service unavailable',
  })
  async getCurrentUserRecommendations(
    @Query() query: GetRecommendationsDto,
    @Req() request: any,
  ) {
    // Lấy user ID từ JWT token
    const studentId = request.user?.userId || request.user?.id;
    
    if (!studentId) {
      this.logger.error('Student ID not found in auth context');
      throw new HttpException('Student ID not found in auth context', HttpStatus.UNAUTHORIZED);
    }

    this.logger.log(`Getting recommendations for current user ${studentId}`);

    const recommendationRequest: RecommendationRequest = {
      studentId,
      limit: query.limit || 3,
      refresh: query.refresh || false,
    };

    try {
      return await this.recommendationService.getRecommendations(recommendationRequest);
    } catch (error) {
      this.logger.error(`Failed to get recommendations for user ${studentId}:`, error.message);
      
      // Xử lý các loại lỗi khác nhau
      if (error.message.includes('ML service unavailable')) {
        throw new HttpException('Recommendation service is temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      } else if (error.message.includes('Student not found')) {
        throw new HttpException('Student profile not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('Failed to retrieve recommendations', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  @Get('service/health')
  @ApiOperation({ summary: 'Check recommendation service health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health status',
  })
  async checkServiceHealth() {
    const isHealthy = await this.recommendationService.checkServiceHealth();
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'ml-recommendation-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('service/stats')
  @ApiOperation({ summary: 'Get recommendation service statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved service statistics',
  })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async getServiceStats() {
    return await this.recommendationService.getServiceStats();
  }

  // Endpoint cho specific student (admin/instructor only)
  @Get(':studentId')
  @ApiOperation({ summary: 'Get course recommendations for a specific student' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved recommendations',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Student not found',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'ML service unavailable',
  })
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @UseGuards(RolesGuard)
  async getRecommendations(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: GetRecommendationsDto,
    @Req() request: any,
  ) {
    const currentUserId = request.user?.userId || request.user?.id;
    
    // Nếu không phải admin/instructor, chỉ cho phép xem recommendations của chính mình
    if (request.user?.role === UserRole.STUDENT && currentUserId !== studentId) {
      throw new HttpException('You can only view your own recommendations', HttpStatus.FORBIDDEN);
    }

    this.logger.log(`Getting recommendations for student ${studentId} (requested by user ${currentUserId})`);

    const recommendationRequest: RecommendationRequest = {
      studentId,
      limit: query.limit || 3,
      refresh: query.refresh || false,
    };

    return await this.recommendationService.getRecommendations(recommendationRequest);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Get recommendations for multiple students' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved batch recommendations',
  })
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @UseGuards(RolesGuard)
  async getBatchRecommendations(@Body() body: BatchRecommendationsDto) {
    this.logger.log(`Getting batch recommendations for ${body.studentIds.length} students`);

    const request: BatchRecommendationRequest = {
      studentIds: body.studentIds,
      limit: body.limit || 3,
    };

    return await this.recommendationService.getBatchRecommendations(request);
  }

  @Post('retrain')
  @ApiOperation({ summary: 'Retrain the recommendation model' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Model retraining initiated successfully',
  })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async retrainModel() {
    this.logger.log('Admin initiated model retraining');
    return await this.recommendationService.retrainModel();
  }

  @Post('cache/clear')
  @ApiOperation({ summary: 'Clear recommendation cache' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cache cleared successfully',
  })
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  async clearCache() {
    this.logger.log('Admin initiated cache clear');
    return await this.recommendationService.clearCache();
  }
}