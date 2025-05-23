import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { DataSource } from 'typeorm';

@Controller('api/courses')
export class StudentManagementController {
  constructor(
    private readonly dataSource: DataSource
  ) {}

  @Get(':id/students')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching enrolled students:', error);
      throw new Error('Server error');
    }
  }

  @Get(':courseId/students/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getStudentProgress(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Request() req
  ): Promise<any> {
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
      
      // Get student details
      const students = await this.dataSource.query(`
        SELECT u.id, u.first_name, u.last_name, u.email, 
               u.profile_image, u.bio, e.enrollment_date, e.completion_status
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_id = ? AND e.student_id = ?
      `, [courseId, studentId]);
      
      if (students.length === 0) {
        throw new NotFoundException('Student not enrolled in this course');
      }
      
      const student = students[0];
      
      // Get assignment submissions
      const submissions = await this.dataSource.query(`
        SELECT s.*, a.title as assignment_title, a.due_date
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ? AND a.course_id = ?
        ORDER BY s.submission_date DESC
      `, [studentId, courseId]);
      
      // Get quiz attempts
      const quizAttempts = await this.dataSource.query(`
        SELECT qa.*, q.title as quiz_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.student_id = ? AND q.course_id = ?
        ORDER BY qa.start_time DESC
      `, [studentId, courseId]);
      
      // Get discussion activity
      const discussionPosts = await this.dataSource.query(`
        SELECT dp.*, d.title as discussion_title
        FROM discussion_posts dp
        JOIN discussions d ON dp.discussion_id = d.id
        WHERE dp.user_id = ? AND d.course_id = ?
        ORDER BY dp.created_at DESC
      `, [studentId, courseId]);
      
      return {
        student,
        submissions,
        quizAttempts,
        discussionPosts,
        // Calculate stats
        stats: {
          assignmentCompletionRate: submissions.length,
          quizAvgScore: quizAttempts.length > 0 ? 
            quizAttempts.reduce((sum, attempt) => sum + (attempt.score || 0), 0) / quizAttempts.length : 0,
          discussionParticipation: discussionPosts.length
        }
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching student progress:', error);
      throw new Error('Server error');
    }
  }
}
