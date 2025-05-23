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
export class CourseDetailApiController {
  constructor(private readonly dataSource: DataSource) {}

  @Get(':id/detail')
  async getCourseDetail(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req,
  ): Promise<any> {
    try {
      console.log(`Fetching details for course: ${courseId}`);
      
      // Get course info with instructor and department
      const courses = await this.dataSource.query(
        `SELECT c.*, 
               u.first_name, u.last_name, 
               d.name as department_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.id = ?`,
        [courseId],
      );
      
      if (courses.length === 0) {
        return { message: 'Course not found' };
      }
      
      const course = courses[0];
      
      // Format response
      const formattedCourse = {
        id: course.id,
        code: course.code,
        title: course.title,
        instructor: `${course.first_name} ${course.last_name}`,
        instructorId: course.instructor_id,
        department: course.department_name,
        departmentId: course.department_id,
        description: course.description,
        startDate: course.start_date 
          ? new Date(course.start_date).toISOString().split('T')[0]
          : null,
        endDate: course.end_date 
          ? new Date(course.end_date).toISOString().split('T')[0]
          : null,
        status: course.status.charAt(0).toUpperCase() + course.status.slice(1),
        thumbnail: course.thumbnail_url,
        isFeatured: course.is_featured === 1,
      };
      
      return formattedCourse;
    } catch (error) {
      console.error('Error fetching course details:', error);
      return { message: 'Server error' };
    }
  }
}
