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
  destination: function(req, file, cb) {
    const courseId = req.params.courseId;
    const dir = path.join(process.cwd(), 'uploads', 'lessons', courseId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'lesson-' + uniqueSuffix + ext);
  }
});

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly dataSource: DataSource
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
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
  async findAllPublic(): Promise<CourseResponseDto[]> {
    const courses = await this.coursesService.findAllPublicCourses();
    return Promise.all(courses.map(course => 
      this.coursesService.toCourseResponseDto(course)
    ));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
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

  @Get(':id/details')
  @UseGuards(JwtAuthGuard)
  async findDetails(@Param('id') id: string): Promise<any> {
    const course = await this.coursesService.findCourseWithDetailsById(+id);
    const courseDto = await this.coursesService.toCourseResponseDto(course);
    
    // Add modules and lessons info
    const formattedCourse = {
      ...courseDto,
      modules: course.modules.map(module => ({
        id: module.id,
        title: module.title,
        description: module.description,
        orderIndex: module.orderIndex,
        isPublished: module.isPublished,
        lessons: module.lessons?.map(lesson => ({
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          contentType: lesson.contentType,
          durationMinutes: lesson.durationMinutes,
          orderIndex: lesson.orderIndex,
          isPublished: lesson.isPublished,
        })) || [],
      })),
    };
    
    return formattedCourse;
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

  @Post('debug/test-status')
  async testStatus(@Body() data: any): Promise<any> {
    // Log the incoming data
    console.log('Test status received:', data);
    
    // Try to convert the status string using our transform
    if (data.status && typeof data.status === 'string') {
      const lowercaseStatus = data.status.toLowerCase();
      console.log('Lowercase status:', lowercaseStatus);
      
      // Check if it's a valid value
      const validValues = Object.values(CourseStatus);
      console.log('Valid status values:', validValues);
      console.log('Is valid status:', validValues.includes(lowercaseStatus));
      
      // Create a new course DTO and see what happens
      const dto = new CreateCourseDto();
      dto.title = 'Test Course';
      dto.code = 'TEST';
      dto.status = data.status;
      
      console.log('DTO after assignment:', dto);
    }
    
    return { 
      receivedStatus: data.status,
      validStatusValues: Object.values(CourseStatus)
    };
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
    @Body() createAssignmentDto: CreateAssignmentDto,
    @Request() req,
  ) {
    // Log incoming data for debugging
    console.log('Creating assignment for course:', courseId);
    console.log('DTO:', JSON.stringify(createAssignmentDto));
    
    try {
      const { 
        lessonId, 
        title, 
        description, 
        maxPoints, 
        dueDate,
        allowedFileTypes,
        maxFileSize,
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
      
      // Create assignment - directly using SQL like in server.js
      const insertQuery = `
        INSERT INTO assignments 
        (course_id, lesson_id, title, description, max_points, due_date, allowed_file_types, max_file_size, allow_late_submissions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      console.log('Insert query:', insertQuery);
      console.log('Insert params:', [
        courseId,
        lessonId,
        title,
        description || null,
        maxPoints || 100,
        dueDate,
        allowedFileTypes || 'pdf,docx',
        maxFileSize || 5,
        allowLateSubmissions || false
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
          allowedFileTypes || 'pdf,docx',
          maxFileSize || 5,
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
} 