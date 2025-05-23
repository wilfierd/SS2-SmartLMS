import { Controller, Get, Param, Request, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { DataSource } from 'typeorm';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CourseStudentsApiController {
  constructor(
    private readonly dataSource: DataSource
  ) {}

  @Get(':id/students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getEnrolledStudents(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req
  ): Promise<any[]> {
    try {
      // Check if instructor teaches this course
      if (req.user.role === UserRole.INSTRUCTOR) {
        const courses = await this.dataSource.query(
          'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
          [courseId, req.user.userId]
        );
        
        if (courses.length === 0) {
          throw new ForbiddenException('You can only view students in your own courses');
        }
      }
      
      // Get enrolled students with more details
      const students = await this.dataSource.query(`
        SELECT u.id, u.first_name, u.last_name, u.email, 
               u.profile_image, e.enrollment_date, e.completion_status,
               (SELECT COUNT(*) FROM submissions 
                WHERE student_id = u.id 
                AND assignment_id IN (SELECT id FROM assignments WHERE course_id = ?)) as submission_count,
               (SELECT COUNT(*) FROM quiz_attempts 
                WHERE student_id = u.id 
                AND quiz_id IN (SELECT id FROM quizzes WHERE course_id = ?)) as quiz_attempt_count
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_id = ?
        ORDER BY u.last_name, u.first_name
      `, [courseId, courseId, courseId]);
      
      return students;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error fetching enrolled students:', error);
      return [];
    }
  }
}
