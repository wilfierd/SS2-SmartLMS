import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/enums/user-role.enum';
import { CourseStatus } from './entities/course.entity';
import { DataSource } from 'typeorm';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CourseModule } from './entities/course-module.entity';

// Configure multer storage for lesson materials
const lessonStorage = diskStorage({
  destination: function (req, file, cb) {
    const courseId = req.params.courseId;
    const dir = path.join(process.cwd(), 'uploads', 'lessons', courseId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'lesson-' + uniqueSuffix + ext);
  }
});

@ApiTags('courses')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly dataSource: DataSource
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all courses with optional filtering' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by course status', example: 'ACTIVE' })
  @ApiQuery({ name: 'featured', required: false, description: 'Filter featured courses', example: 'true' })
  @ApiResponse({ status: 200, description: 'List of courses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req, @Query('status') status?: string, @Query('featured') featured?: string): Promise<any[]> {
    try {
      console.log("Fetching courses...");
      // Use exact implementation from Express but don't destructure the result
      const coursesResult = await this.dataSource.query(`
        SELECT c.*, 
               u.first_name, u.last_name, 
               d.name as department_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        ORDER BY c.created_at DESC
      `);

      // TypeORM raw query returns the results directly
      const courses = coursesResult || [];

      console.log(`Found ${courses.length} courses`);

      // Get the baseUrl just like Express does
      const baseUrl = `http://${req.headers.host}`;
      console.log(`Using baseUrl: ${baseUrl}`);

      // Format the response exactly like Express does
      const formattedCourses = courses.map(course => ({
        id: course.id,
        code: course.code,
        title: course.title,
        instructor: course.first_name && course.last_name ? `${course.first_name} ${course.last_name}` : 'Unknown',
        instructorId: course.instructor_id,
        department: course.department_name,
        departmentId: course.department_id,
        description: course.description,
        startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
        endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
        status: course.status || 'draft',
        thumbnailUrl: course.thumbnail_url ?
          (course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`)
          : null,
        isFeatured: course.is_featured === 1
      }));

      console.log(`Formatted ${formattedCourses.length} courses`);
      return formattedCourses;
    } catch (error) {
      console.error('Error fetching courses:', error);
      return [];
    }
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a new course (Admin/Instructor only)' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({ status: 201, description: 'Course created successfully', type: CourseResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Instructor role required' })
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @Request() req,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.create(
      createCourseDto,
      req.user.id,
      req.user.role,
    );
    return this.coursesService.toCourseResponseDto(course);
  }

  @Get('public')
  @ApiOperation({ summary: 'Get all public courses (no authentication required)' })
  @ApiResponse({ status: 200, description: 'List of public courses', type: [CourseResponseDto] })
  async findAllPublic(): Promise<CourseResponseDto[]> {
    const courses = await this.coursesService.findAllPublicCourses();
    return Promise.all(courses.map(course =>
      this.coursesService.toCourseResponseDto(course)
    ));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'Course details', type: CourseResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async findOne(@Param('id') id: string, @Request() req): Promise<any> {
    try {
      console.log(`Fetching course with ID: ${id}`);
      // Use exact implementation from Express but don't destructure the result
      const coursesResult = await this.dataSource.query(`
        SELECT c.*, 
               u.first_name, u.last_name, 
               d.name as department_name
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.id = ?
      `, [id]);

      const courses = coursesResult || [];

      if (courses.length === 0) {
        console.log(`No course found with ID: ${id}`);
        throw new NotFoundException('Course not found');
      }

      const course = courses[0];
      console.log(`Found course: ${course.title}`);

      // Get the baseUrl just like Express does
      const baseUrl = `http://${req.headers.host}`;

      return {
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
        status: course.status || 'draft',
        thumbnailUrl: course.thumbnail_url ?
          (course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `${baseUrl}${course.thumbnail_url}`)
          : null,
        isFeatured: course.is_featured === 1 // Convert to boolean
      };
    } catch (error) {
      console.error('Error fetching course:', error);
      throw error;
    }
  }

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

  // NEW: Consolidated from course-statistics-api.controller.ts
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

  // NEW: Consolidated from course-discussions-api.controller.ts
  @Get(':id/discussions')
  @UseGuards(JwtAuthGuard)
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

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @Request() req,
  ): Promise<CourseResponseDto> {
    console.log('Updating course with data:', JSON.stringify(updateCourseDto));
    if (updateCourseDto.status) {
      console.log('Status received in update:', updateCourseDto.status);
      console.log('Valid status values:', Object.values(CourseStatus));
    }
    const course = await this.coursesService.update(
      +id,
      updateCourseDto,
      req.user.id,
      req.user.role,
    );
    return this.coursesService.toCourseResponseDto(course);
  }

  @Put(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async archive(
    @Param('id') id: string,
    @Request() req,
  ): Promise<CourseResponseDto> {
    const course = await this.coursesService.archive(
      +id,
      req.user.id,
      req.user.role,
    );
    return this.coursesService.toCourseResponseDto(course);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ): Promise<{ message: string }> {
    try {
      console.log(`Deleting course with ID: ${id}`);
      await this.coursesService.remove(id, req.user.id, req.user.role);
      return { message: 'Course deleted successfully' };
    } catch (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  }

  @Post('batch-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async batchDelete(
    @Body('courseIds') courseIds: number[],
    @Request() req,
  ): Promise<{ message: string }> {
    try {
      console.log(`Batch deleting courses with IDs: ${JSON.stringify(courseIds)}`);

      if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
        throw new BadRequestException('No course IDs provided for deletion');
      }

      await this.coursesService.batchDelete(courseIds, req.user.id, req.user.role);
      return { message: `${courseIds.length} courses deleted successfully` };
    } catch (error) {
      console.error('Error batch deleting courses:', error);
      throw error;
    }
  }

  @Post(':courseId/lessons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @UseInterceptors(FilesInterceptor('materials', 10, { storage: lessonStorage }))
  async createLesson(
    @Param('courseId') courseId: string,
    @Body() createLessonDto: CreateLessonDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Request() req,
  ) {
    // Log incoming data for debugging
    console.log('Creating lesson for course:', courseId);
    console.log('DTO:', JSON.stringify(createLessonDto));
    console.log('Files:', files ? files.length : 0);

    // Create a direct connection for transaction
    const connection = await this.dataSource.createQueryRunner();
    await connection.connect();
    await connection.startTransaction();

    try {
      const { moduleId, title, description, content, contentType, videoUrl } = createLessonDto;
      const userId = req.user.id;

      // Validate input
      if (!title || !moduleId) {
        throw new BadRequestException('Lesson title and module ID are required');
      }

      // Check if user is an admin or the instructor of the course
      if (req.user.role !== UserRole.ADMIN) {
        const courseCheck = await connection.query(
          'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
          [courseId, userId]
        );

        console.log('Course check result:', JSON.stringify(courseCheck));

        if (!courseCheck || courseCheck.length === 0) {
          await connection.rollbackTransaction();
          throw new BadRequestException('You can only add lessons to your own courses');
        }
      }

      // Verify the module belongs to the course
      const moduleCheck = await connection.query(
        'SELECT * FROM course_modules WHERE id = ? AND course_id = ?',
        [moduleId, courseId]
      );

      console.log('Module check result:', JSON.stringify(moduleCheck));

      if (!moduleCheck || moduleCheck.length === 0) {
        await connection.rollbackTransaction();
        throw new NotFoundException('Module not found or does not belong to this course');
      }

      // Get the next order index
      const orderResult = await connection.query(
        'SELECT MAX(order_index) as max_order FROM lessons WHERE module_id = ?',
        [moduleId]
      );

      console.log('Order result:', JSON.stringify(orderResult));

      // Safely handle the max_order value
      let nextOrder = 1; // Default to 1 if no results
      if (orderResult && orderResult.length > 0 && orderResult[0].max_order !== null) {
        nextOrder = parseInt(orderResult[0].max_order) + 1;
      }

      console.log('Next order index:', nextOrder);

      // Process video URL for video content type
      let finalContent = content;
      if (contentType === 'video' && videoUrl) {
        finalContent = videoUrl;
      }

      // Insert the lesson
      try {
        const insertQuery = `
          INSERT INTO lessons 
          (module_id, title, description, content_type, content, order_index, is_published) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        console.log('Insert query:', insertQuery);
        console.log('Insert params:', [moduleId, title, description || null, contentType, finalContent || null, nextOrder, 1]);

        const lessonResult = await connection.query(
          insertQuery,
          [moduleId, title, description || null, contentType, finalContent || null, nextOrder, 1]
        );

        console.log('Lesson insert result:', JSON.stringify(lessonResult));

        // Get inserted ID
        let lessonId = lessonResult.insertId;
        if (!lessonId) {
          // Try to get the ID using a separate query if insertId is not available
          const [lastIdResult] = await connection.query('SELECT LAST_INSERT_ID() as id');
          console.log('Last insert ID result:', JSON.stringify(lastIdResult));

          if (lastIdResult && lastIdResult.id) {
            lessonId = lastIdResult.id;
          } else {
            throw new Error('Could not determine lesson ID after insert');
          }
        }

        console.log('Lesson ID:', lessonId);

        // Process uploaded files as materials if any
        if (files && files.length > 0) {
          for (const file of files) {
            const filePath = `/uploads/lessons/${courseId}/${file.filename}`;
            const fileExt = path.extname(file.originalname).toLowerCase();

            // Determine material type based on file extension
            let materialType = 'document'; // Default
            if (['.jpg', '.jpeg', '.png', '.gif', '.svg'].includes(fileExt)) {
              materialType = 'image';
            } else if (['.mp4', '.avi', '.mov', '.wmv', '.flv'].includes(fileExt)) {
              materialType = 'video';
            } else if (['.mp3', '.wav', '.ogg'].includes(fileExt)) {
              materialType = 'audio';
            } else if (['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt'].includes(fileExt)) {
              materialType = 'document';
            }

            // Insert the material
            const materialInsertQuery = `
              INSERT INTO lesson_materials 
              (lesson_id, title, file_path, material_type) 
              VALUES (?, ?, ?, ?)
            `;
            console.log('Material insert query:', materialInsertQuery);
            console.log('Material insert params:', [lessonId, file.originalname, filePath, materialType]);

            const materialResult = await connection.query(
              materialInsertQuery,
              [lessonId, file.originalname, filePath, materialType]
            );

            console.log('Material insert result:', JSON.stringify(materialResult));
          }
        }

        // If video URL is provided for non-video content type, add it as a material
        if (videoUrl && contentType !== 'video') {
          const videoMaterialQuery = `
            INSERT INTO lesson_materials 
            (lesson_id, title, external_url, material_type) 
            VALUES (?, ?, ?, ?)
          `;
          console.log('Video material query:', videoMaterialQuery);
          console.log('Video material params:', [lessonId, 'Video Reference', videoUrl, 'video']);

          const videoMaterialResult = await connection.query(
            videoMaterialQuery,
            [lessonId, 'Video Reference', videoUrl, 'video']
          );

          console.log('Video material insert result:', JSON.stringify(videoMaterialResult));
        }

        await connection.commitTransaction();
        console.log('Transaction committed successfully');

        return {
          message: 'Lesson created successfully',
          lessonId: lessonId
        };
      } catch (insertError) {
        console.error('Insert error:', insertError);
        await connection.rollbackTransaction();
        throw insertError;
      }

    } catch (error) {
      await connection.rollbackTransaction();

      // Clean up uploaded files in case of error
      if (files && files.length > 0) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      console.error('Error creating lesson:', error);
      throw error;
    } finally {
      await connection.release();
    }
  }

  @Post(':courseId/assignments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async createAssignment(
    @Param('courseId') courseId: string,
    @Body() requestBody: any,
    @Request() req,
  ) {
    // Map snake_case to camelCase properties
    const createAssignmentDto = {
      lessonId: requestBody.lesson_id,
      title: requestBody.title,
      description: requestBody.description,
      maxPoints: requestBody.max_points,
      dueDate: requestBody.due_date,
      allowLateSubmissions: requestBody.allow_late_submissions
    };

    // Log incoming data for debugging
    console.log('Creating assignment for course:', courseId);
    console.log('Request body:', JSON.stringify(requestBody));
    console.log('Mapped DTO:', JSON.stringify(createAssignmentDto));

    try {
      const {
        lessonId,
        title,
        description,
        maxPoints,
        dueDate,
        allowLateSubmissions
      } = createAssignmentDto;

      // Validation
      if (!title || !lessonId || !dueDate) {
        throw new BadRequestException('Title, lesson, and due date are required');
      }

      // For instructors, verify they teach this course
      if (req.user.role === UserRole.INSTRUCTOR) {
        const courses = await this.dataSource.query(
          'SELECT * FROM courses WHERE id = ? AND instructor_id = ?',
          [courseId, req.user.id]
        );

        console.log('Course check result:', JSON.stringify(courses));

        if (!courses || courses.length === 0) {
          throw new BadRequestException('You can only create assignments for your own courses');
        }
      }

      // Verify the module exists for the course
      const moduleCheck = await this.dataSource.query(
        'SELECT * FROM course_modules WHERE id = ? AND course_id = ?',
        [lessonId, courseId]
      );

      console.log('Module check result:', JSON.stringify(moduleCheck));

      if (!moduleCheck || moduleCheck.length === 0) {
        throw new NotFoundException(`Module with ID "${lessonId}" not found for this course`);
      }

      // Create assignment with only columns that exist in the database
      // Remove allowed_file_types and max_file_size which are causing errors
      const insertQuery = `
        INSERT INTO assignments 
        (course_id, lesson_id, title, description, max_points, due_date, allow_late_submissions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      console.log('Insert query:', insertQuery);
      console.log('Insert params:', [
        courseId,
        lessonId,
        title,
        description || null,
        maxPoints || 100,
        dueDate,
        allowLateSubmissions ? 1 : 0
      ]);

      const result = await this.dataSource.query(
        insertQuery,
        [
          courseId,
          lessonId,
          title,
          description || null,
          maxPoints || 100,
          dueDate,
          allowLateSubmissions ? 1 : 0
        ]
      );

      console.log('Assignment insert result:', JSON.stringify(result));

      // Try different approaches to get the insertId
      let assignmentId;

      if (result && result.insertId) {
        // Direct access
        assignmentId = result.insertId;
      } else if (result && result[0] && result[0].insertId) {
        // Array access
        assignmentId = result[0].insertId;
      } else {
        // Try to get the last inserted ID
        const [lastIdResult] = await this.dataSource.query('SELECT LAST_INSERT_ID() as id');
        console.log('Last insert ID result:', JSON.stringify(lastIdResult));

        if (lastIdResult && lastIdResult.id) {
          assignmentId = lastIdResult.id;
        } else {
          // Just return a success message without an ID
          return {
            message: 'Assignment created successfully'
          };
        }
      }

      return {
        message: 'Assignment created successfully',
        assignmentId
      };
    } catch (error) {
      console.error('Error creating assignment:', error);
      throw error;
    }
  }

  @Get(':courseId/assignments')
  @UseGuards(JwtAuthGuard)
  async getAssignmentsForCourse(@Param('courseId') courseId: string, @Request() req) {
    try {
      console.log(`Fetching assignments for course: ${courseId}`);

      // Query assignments using raw SQL like in Express
      const assignments = await this.dataSource.query(
        `SELECT a.*, cm.title as lesson_title
         FROM assignments a
         JOIN course_modules cm ON a.lesson_id = cm.id
         WHERE a.course_id = ?
         ORDER BY a.due_date ASC`,
        [courseId]
      );

      console.log(`Found ${assignments.length} assignments`);

      // For students, include submission status
      if (req.user.role === UserRole.STUDENT) {
        const studentId = req.user.userId;

        // Get submission status for each assignment
        for (let assignment of assignments) {
          const submissions = await this.dataSource.query(
            `SELECT * FROM assignment_submissions 
             WHERE assignment_id = ? AND student_id = ?
             ORDER BY submission_date DESC LIMIT 1`,
            [assignment.id, studentId]
          );

          if (submissions.length > 0) {
            assignment.submission = {
              id: submissions[0].id,
              date: submissions[0].submission_date,
              isLate: submissions[0].is_late,
              grade: submissions[0].grade,
              status: submissions[0].grade ? 'graded' : 'submitted'
            };
          } else {
            assignment.submission = null;
          }
        }
      }

      return assignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      throw error;
    }
  }
}