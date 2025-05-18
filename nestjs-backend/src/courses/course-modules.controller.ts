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
    return this.courseModulesService.create(
      +courseId,
      createCourseModuleDto,
      req.user.id,
      req.user.role,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('courseId') courseId: string) {
    return this.courseModulesService.findByCourse(+courseId);
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