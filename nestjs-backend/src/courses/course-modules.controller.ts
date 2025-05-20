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
  constructor(private readonly courseModulesService: CourseModulesService) {}

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
      // This implementation follows the Express.js pattern more closely
      const modules = await this.courseModulesService.findByCourseWithLessons(+courseId);
      
      if (!modules || modules.length === 0) {
        return [];
      }
      
      // Format the response like Express does
      const formattedModules = modules.map(module => {
        // Process lessons from concatenated strings
        let lessons = [];
        
        if (module.lesson_ids) {
          const ids = module.lesson_ids.split(',');
          const titles = module.lesson_titles ? module.lesson_titles.split(',') : [];
          const descriptions = module.lesson_descriptions ? module.lesson_descriptions.split(',') : [];
          const contentTypes = module.lesson_content_types ? module.lesson_content_types.split(',') : [];
          const contents = module.lesson_contents ? module.lesson_contents.split(',') : [];
          const durations = module.lesson_durations ? module.lesson_durations.split(',') : [];
          const orderIndexes = module.lesson_order_indexes ? module.lesson_order_indexes.split(',') : [];
          const isPublishedArray = module.lesson_is_published ? module.lesson_is_published.split(',') : [];
          
          lessons = ids.map((id, index) => ({
            id: parseInt(id),
            title: titles[index] || '',
            description: descriptions[index] || null,
            contentType: contentTypes[index] || 'text',
            content: contents[index] || null,
            durationMinutes: durations[index] ? parseInt(durations[index]) : null,
            orderIndex: orderIndexes[index] ? parseInt(orderIndexes[index]) : 0,
            isPublished: isPublishedArray[index] === '1',
            materials: [] // We'll need a separate query for materials if needed
          }));
        }
        
        return {
          id: module.id,
          title: module.title,
          description: module.description,
          orderIndex: module.order_index,
          isPublished: module.is_published === 1,
          lessons: lessons
        };
      });
      
      return formattedModules;
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