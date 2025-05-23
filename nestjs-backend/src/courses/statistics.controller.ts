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
export class CourseStatisticsController {
  constructor(
    private readonly dataSource: DataSource
  ) {}

  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getCourseStatistics(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req
  ): Promise<any> {
    try {
      // For instructors, verify they teach this course
      if (req.user.role === UserRole.INSTRUCTOR) {
        const courses = await this.dataSource.query(
          'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
          [courseId, req.user.userId]
        );
        
        if (courses.length === 0) {
          throw new ForbiddenException('You can only view statistics for your own courses');
        }
      }
      
      // Get enrollment stats
      const enrollmentStats = await this.dataSource.query(`
        SELECT 
          COUNT(*) as total_students,
          SUM(CASE WHEN completion_status = 'completed' THEN 1 ELSE 0 END) as completed_count,
          SUM(CASE WHEN completion_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
          SUM(CASE WHEN completion_status = 'not_started' THEN 1 ELSE 0 END) as not_started_count
        FROM enrollments
        WHERE course_id = ?
      `, [courseId]);
      
      // Get assignment stats
      const assignmentStats = await this.dataSource.query(`
        SELECT
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as total_submissions,
          AVG(s.grade) as average_grade,
          SUM(CASE WHEN s.is_graded = 1 THEN 1 ELSE 0 END) as graded_count
        FROM assignments a
        LEFT JOIN submissions s ON a.id = s.assignment_id
        WHERE a.course_id = ?
      `, [courseId]);
      
      // Get quiz stats
      const quizStats = await this.dataSource.query(`
        SELECT
          COUNT(DISTINCT q.id) as total_quizzes,
          COUNT(DISTINCT qa.id) as total_attempts,
          AVG(qa.score) as average_score,
          SUM(CASE WHEN qa.is_passing = 1 THEN 1 ELSE 0 END) as passing_count
        FROM quizzes q
        LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id
        WHERE q.course_id = ?
      `, [courseId]);
      
      // Get discussion stats
      const discussionStats = await this.dataSource.query(`
        SELECT
          COUNT(DISTINCT d.id) as total_discussions,
          COUNT(DISTINCT dp.id) as total_posts,
          COUNT(DISTINCT dp.user_id) as participating_students
        FROM discussions d
        LEFT JOIN discussion_posts dp ON d.id = dp.discussion_id
        WHERE d.course_id = ?
      `, [courseId]);
      
      // Get completion trend over time (last 6 months)
      const completionTrend = await this.dataSource.query(`
        SELECT 
          DATE_FORMAT(e.enrollment_date, '%Y-%m') as month,
          COUNT(*) as enrollments,
          SUM(CASE WHEN e.completion_status = 'completed' THEN 1 ELSE 0 END) as completions
        FROM enrollments e
        WHERE e.course_id = ? AND e.enrollment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(e.enrollment_date, '%Y-%m')
        ORDER BY month
      `, [courseId]);
      
      return {
        enrollmentStats: enrollmentStats[0],
        assignmentStats: assignmentStats[0],
        quizStats: quizStats[0],
        discussionStats: discussionStats[0],
        completionTrend
      };
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching course statistics:', error);
      throw new Error('Server error');
    }
  }
}
