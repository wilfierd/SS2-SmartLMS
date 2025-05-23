import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataSource } from 'typeorm';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CourseDiscussionsApiController {
  constructor(private readonly dataSource: DataSource) {}

  @Get(':id/discussions')
  async getCourseDiscussions(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req,
  ): Promise<any[]> {
    try {
      // Get all discussions for the course
      const discussions = await this.dataSource.query(
        `SELECT d.*, 
               u.first_name, u.last_name,
               COUNT(dp.id) as post_count
        FROM discussions d
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN discussion_posts dp ON d.id = dp.discussion_id
        WHERE d.course_id = ?
        GROUP BY d.id
        ORDER BY d.created_at DESC`,
        [courseId],
      );
      
      // Format discussions
      return discussions.map((discussion) => ({
        id: discussion.id,
        title: discussion.title,
        description: discussion.description,
        createdBy: `${discussion.first_name} ${discussion.last_name}`,
        createdAt: new Date(discussion.created_at).toISOString(),
        postCount: discussion.post_count,
        isActive: discussion.is_active === 1,
      }));
    } catch (error) {
      console.error('Error fetching course discussions:', error);
      return [];
    }
  }
}
