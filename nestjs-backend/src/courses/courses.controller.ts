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
  NotFoundException
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { CourseStatus } from './entities/course.entity';
import { DataSource } from 'typeorm';

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
        status: course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Draft',
        thumbnail: course.thumbnail_url ? 
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
        status: course.status.charAt(0).toUpperCase() + course.status.slice(1), // Capitalize status
        thumbnail: course.thumbnail_url ? 
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
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ message: string }> {
    await this.coursesService.remove(+id, req.user.id, req.user.role);
    return { message: 'Course deleted successfully' };
  }

  @Post('batch-delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async batchDelete(
    @Body('ids') ids: number[],
    @Request() req,
  ): Promise<{ message: string }> {
    await this.coursesService.batchDelete(ids, req.user.id, req.user.role);
    return { message: `${ids.length} courses deleted successfully` };
  }
} 