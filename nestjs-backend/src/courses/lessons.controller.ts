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
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('modules/:moduleId/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async create(
    @Param('moduleId') moduleId: string,
    @Body() createLessonDto: CreateLessonDto,
    @Request() req,
  ) {
    // Make sure moduleId from URL is used
    createLessonDto.moduleId = +moduleId;
    
    return this.lessonsService.create(
      createLessonDto,
      req.user.id,
      req.user.role,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findByModule(+moduleId);
  }

  @Get(':lessonId')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('lessonId') lessonId: string) {
    return this.lessonsService.findOne(+lessonId);
  }

  @Put(':lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async update(
    @Param('lessonId') lessonId: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Request() req,
  ) {
    return this.lessonsService.update(
      +lessonId,
      updateLessonDto,
      req.user.id,
      req.user.role,
    );
  }

  @Delete(':lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async remove(
    @Param('lessonId') lessonId: string,
    @Request() req,
  ) {
    await this.lessonsService.remove(+lessonId, req.user.id, req.user.role);
    return { message: 'Lesson deleted successfully' };
  }
} 