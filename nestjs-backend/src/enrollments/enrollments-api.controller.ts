import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DataSource } from 'typeorm';

@Controller('api/enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsApiController {
  constructor(
    private readonly dataSource: DataSource
  ) {}

  @Get('my-courses')
  async getMyEnrolledCourses(
    @Request() req
  ): Promise<any[]> {
    try {
      // Use raw SQL query similar to the Express implementation
      const enrollments = await this.dataSource.query(`
        SELECT c.*, 
               u.first_name, u.last_name, e.enrollment_date, e.completion_status
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = ?
        ORDER BY e.enrollment_date DESC
      `, [req.user.userId]);
      
      // Format response
      const formattedCourses = enrollments.map(course => ({
        id: course.id,
        code: course.code,
        title: course.title,
        instructor: `${course.first_name} ${course.last_name}`,
        instructorId: course.instructor_id,
        department: course.department_id,
        description: course.description,
        startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
        endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
        status: course.status || 'draft',
        thumbnail: course.thumbnail_url,
        enrollmentDate: course.enrollment_date,
        completionStatus: course.completion_status
      }));
      
      return formattedCourses;
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      return [];
    }
  }
}
