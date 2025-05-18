import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from './entities/course-module.entity';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CoursesService } from './courses.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class CourseModulesService {
  constructor(
    @InjectRepository(CourseModule)
    private courseModulesRepository: Repository<CourseModule>,
    private coursesService: CoursesService,
  ) {}

  async create(courseId: number, createCourseModuleDto: CreateCourseModuleDto, userId: number, userRole: UserRole): Promise<CourseModule> {
    // Check if user has permissions to modify this course
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only add modules to your own courses');
      }
    }
    
    // Find the next order index if not provided
    let { orderIndex } = createCourseModuleDto;
    if (orderIndex === undefined) {
      const lastModule = await this.courseModulesRepository.findOne({
        where: { courseId },
        order: { orderIndex: 'DESC' },
      });
      orderIndex = lastModule ? lastModule.orderIndex + 1 : 0;
    }
    
    const courseModule = this.courseModulesRepository.create({
      ...createCourseModuleDto,
      courseId,
      orderIndex,
    });
    
    return this.courseModulesRepository.save(courseModule);
  }

  async findByCourse(courseId: number): Promise<CourseModule[]> {
    return this.courseModulesRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });
  }

  async findOne(id: number): Promise<CourseModule> {
    const courseModule = await this.courseModulesRepository.findOne({
      where: { id },
      relations: ['course'],
    });
    
    if (!courseModule) {
      throw new NotFoundException(`Course module with ID ${id} not found`);
    }
    
    return courseModule;
  }

  async update(id: number, updateCourseModuleDto: UpdateCourseModuleDto, userId: number, userRole: UserRole): Promise<CourseModule> {
    const courseModule = await this.findOne(id);
    
    // Check if user has permissions to modify this module
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseModule.courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only update modules of your own courses');
      }
    }
    
    // Update module properties
    Object.assign(courseModule, updateCourseModuleDto);
    
    return this.courseModulesRepository.save(courseModule);
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const courseModule = await this.findOne(id);
    
    // Check if user has permissions to modify this module
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseModule.courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only delete modules of your own courses');
      }
    }
    
    const result = await this.courseModulesRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Course module with ID ${id} not found`);
    }
  }

  async getModuleCourseId(moduleId: number): Promise<number> {
    const module = await this.findOne(moduleId);
    return module.courseId;
  }
} 