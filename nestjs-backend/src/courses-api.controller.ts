import { Controller, Get, Param, Request, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { Roles } from './common/decorators/roles.decorator';
import { RolesGuard } from './common/guards/roles.guard';
import { UserRole } from './common/enums/user-role.enum';
import { DataSource } from 'typeorm';

@Controller('api/courses')
@UseGuards(JwtAuthGuard)
export class CoursesApiController {
  constructor(
    private readonly dataSource: DataSource
  ) {}

  @Get(':id/detail')
  async getCourseDetail(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req
  ): Promise<any> {
    try {
      console.log(`Fetching details for course: ${courseId}`);
      
      // Get course info with instructor and department
      const courses = await this.dataSource.query(`
        SELECT c.*, 
               u.first_name, u.last_name, 
               d.name as department_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.id = ?
      `, [courseId]);
      
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
        startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
        endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
        status: course.status ? course.status.charAt(0).toUpperCase() + course.status.slice(1) : 'Draft',
        thumbnail: course.thumbnail_url,
        isFeatured: course.is_featured === 1
      };
      
      return formattedCourse;
    } catch (error) {
      console.error('Error fetching course details:', error);
      return { message: 'Server error' };
    }
  }

  @Get(':id/students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getEnrolledStudents(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req
  ): Promise<any[]> {
    try {
      console.log(`Fetching students for course: ${courseId}`);
      
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

  @Get(':id/statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getCourseStatistics(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req
  ): Promise<any> {
    try {
      console.log(`Fetching statistics for course: ${courseId}`);
      
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
      if (error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error fetching course statistics:', error);
      throw new Error('Server error');
    }
  }

  @Get(':id/discussions')
  async getCourseDiscussions(
    @Param('id', ParseIntPipe) courseId: number,
    @Request() req
  ): Promise<any[]> {
    try {
      console.log(`Fetching discussions for course: ${courseId}`);
      
      // Get all discussions for the course
      const discussions = await this.dataSource.query(`
        SELECT d.*, 
               u.first_name, u.last_name, 
               COUNT(dp.id) as post_count
        FROM discussions d
        LEFT JOIN users u ON d.created_by = u.id
        LEFT JOIN discussion_posts dp ON d.id = dp.discussion_id
        WHERE d.course_id = ?
        GROUP BY d.id
        ORDER BY d.created_at DESC
      `, [courseId]);
      
      // Format discussions
      return discussions.map(discussion => ({
        id: discussion.id,
        title: discussion.title,
        description: discussion.description,
        createdBy: `${discussion.first_name} ${discussion.last_name}`,
        createdAt: new Date(discussion.created_at).toISOString(),
        postCount: discussion.post_count,
        isActive: discussion.is_active === 1
      }));
    } catch (error) {
      console.error('Error fetching course discussions:', error);
      return [];
    }
  }
}
