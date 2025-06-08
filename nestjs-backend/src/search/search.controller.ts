import { Controller, Get, Query, Post, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { 
  SearchDto, 
  SearchResponseDto, 
  FilterOptionsResponseDto 
} from './dto/search.dto';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search content with filters' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search results retrieved successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  async search(@Query() searchDto: SearchDto): Promise<SearchResponseDto> {
    return this.searchService.search(searchDto);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get available filter options' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Filter options retrieved successfully',
    type: FilterOptionsResponseDto,
  })
  async getFilterOptions(): Promise<FilterOptionsResponseDto> {
    return this.searchService.getFilterOptions();
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Reindex all content' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content reindexed successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Reindexing failed',
  })
  async reindexContent(): Promise<{ success: boolean; message: string }> {
    return this.searchService.reindexContent();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check search service health' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search service health status',
  })
  async healthCheck(): Promise<{ healthy: boolean; service: string }> {
    const healthy = await this.searchService.isHealthy();
    return {
      healthy,
      service: 'meilisearch',
    };
  }
} 