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
import { LessonsService } from './lessons.service';
import { CreateLessonMaterialDto } from './dto/create-lesson-material.dto';
import { UpdateLessonMaterialDto } from './dto/update-lesson-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('lessons/:lessonId/materials')
export class LessonMaterialsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async create(
    @Param('lessonId') lessonId: string,
    @Body() createLessonMaterialDto: CreateLessonMaterialDto,
    @Request() req,
  ) {
    // Make sure lessonId from URL is used
    createLessonMaterialDto.lessonId = +lessonId;
    
    return this.lessonsService.addMaterial(
      createLessonMaterialDto,
      req.user.id,
      req.user.role,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('lessonId') lessonId: string) {
    return this.lessonsService.findMaterialsByLesson(+lessonId);
  }

  @Get(':materialId')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('materialId') materialId: string) {
    return this.lessonsService.findOneMaterial(+materialId);
  }

  @Put(':materialId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async update(
    @Param('materialId') materialId: string,
    @Body() updateLessonMaterialDto: UpdateLessonMaterialDto,
    @Request() req,
  ) {
    return this.lessonsService.updateMaterial(
      +materialId,
      updateLessonMaterialDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':materialId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async remove(
    @Param('materialId') materialId: string,
    @Request() req,
  ) {
    await this.lessonsService.removeMaterial(+materialId, req.user.id, req.user.role);
    return { message: 'Lesson material deleted successfully' };
  }
} 