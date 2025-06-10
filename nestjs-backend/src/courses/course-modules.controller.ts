import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards
} from '@nestjs/common';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('courses/:courseId/modules')
export class CourseModulesController {
  constructor(private readonly courseModulesService: CourseModulesService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async create(
    @Param('courseId') courseId: string,
    @Body() createCourseModuleDto: CreateCourseModuleDto,
    @Request() req,
  ) {
    console.log('Creating module for courseId:', courseId);
    console.log('Request body:', JSON.stringify(createCourseModuleDto));
    console.log('User:', JSON.stringify(req.user));

    try {
      const result = await this.courseModulesService.create(
        +courseId,
        createCourseModuleDto,
        req.user.id,
        req.user.role,
      );

      console.log('Module created successfully:', JSON.stringify(result));

      return {
        message: 'Module created successfully',
        moduleId: result.id
      };
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('courseId') courseId: string, @Request() req) {
    try {
      console.log(`Getting modules for course ${courseId}`);

      // Use direct SQL to match server.js
      const connection = await this.courseModulesService.getConnection();

      // Get all modules for the course
      const modules = await connection.query(`
        SELECT * FROM course_modules
        WHERE course_id = ?
        ORDER BY order_index ASC
      `, [courseId]);

      // For each module, get its lessons with materials
      const modulesWithLessons = await Promise.all(modules.map(async (module) => {
        const lessons = await connection.query(`
          SELECT l.*, GROUP_CONCAT(lm.id) as material_ids, 
                GROUP_CONCAT(lm.title) as material_titles, 
                GROUP_CONCAT(lm.file_path) as material_paths, 
                GROUP_CONCAT(lm.external_url) as material_urls,
                GROUP_CONCAT(lm.material_type) as material_types
          FROM lessons l
          LEFT JOIN lesson_materials lm ON l.id = lm.lesson_id
          WHERE l.module_id = ?
          GROUP BY l.id
          ORDER BY l.order_index ASC
        `, [module.id]);

        // Format lessons and materials
        const formattedLessons = lessons.map(lesson => {
          let materials = [];

          if (lesson.material_ids) {
            const ids = lesson.material_ids.split(',');
            const titles = lesson.material_titles ? lesson.material_titles.split(',') : [];
            const paths = lesson.material_paths ? lesson.material_paths.split(',') : [];
            const urls = lesson.material_urls ? lesson.material_urls.split(',') : [];
            const types = lesson.material_types ? lesson.material_types.split(',') : [];

            materials = ids.map((id, index) => ({
              id,
              title: titles[index] || '',
              filePath: paths[index] || null,
              externalUrl: urls[index] || null,
              materialType: types[index] || 'document'
            }));
          }
          return {
            id: lesson.id,
            title: lesson.title,
            description: lesson.description,
            contentType: lesson.content_type,
            content: lesson.content,
            videoUrl: lesson.video_url,
            durationMinutes: lesson.duration_minutes,
            orderIndex: lesson.order_index,
            isPublished: lesson.is_published === 1,
            materials
          };
        });

        return {
          id: module.id,
          title: module.title,
          description: module.description,
          orderIndex: module.order_index,
          isPublished: module.is_published === 1,
          lessons: formattedLessons
        };
      }));

      return modulesWithLessons;
    } catch (error) {
      console.error('Error fetching course modules:', error);
      throw error;
    }
  }

  @Get(':moduleId')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('moduleId') moduleId: string) {
    return this.courseModulesService.findOne(+moduleId);
  }

  @Put(':moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async update(
    @Param('moduleId') moduleId: string,
    @Body() updateCourseModuleDto: UpdateCourseModuleDto,
    @Request() req,
  ) {
    return this.courseModulesService.update(
      +moduleId,
      updateCourseModuleDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':moduleId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async remove(
    @Param('moduleId') moduleId: string,
    @Request() req,
  ) {
    await this.courseModulesService.remove(+moduleId, req.user.id, req.user.role);
    return { message: 'Module deleted successfully' };
  }
} 