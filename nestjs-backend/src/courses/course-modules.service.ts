import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from './entities/course-module.entity';
import { Lesson } from './entities/lesson.entity';
import { LessonMaterial } from './entities/lesson-material.entity';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { CoursesService } from './courses.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class CourseModulesService {
  constructor(
    @InjectRepository(CourseModule)
    private courseModulesRepository: Repository<CourseModule>,
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
    @InjectRepository(LessonMaterial)
    private lessonMaterialsRepository: Repository<LessonMaterial>,
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

  async findByCourseWithLessons(courseId: number): Promise<any[]> {
    // First, get all modules for the course
    const modules = await this.courseModulesRepository.find({
      where: { courseId },
      order: { orderIndex: 'ASC' },
    });
    
    // If no modules are found, return empty array
    if (!modules || modules.length === 0) {
      return [];
    }
    
    // For each module, get its lessons
    const modulesWithLessons = await Promise.all(modules.map(async (module) => {
      // Get all lessons for this module
      const lessons = await this.lessonsRepository.find({
        where: { moduleId: module.id },
        order: { orderIndex: 'ASC' },
      });
      
      // For each lesson, get its materials
      const lessonsWithMaterials = await Promise.all(lessons.map(async (lesson) => {
        const materials = await this.lessonMaterialsRepository.find({
          where: { lessonId: lesson.id }
        });
        
        // Format the materials to match Express response
        const formattedMaterials = materials.map(material => ({
          id: material.id,
          title: material.title,
          filePath: material.filePath,
          externalUrl: material.externalUrl,
          materialType: material.materialType
        }));
        
        // Return the lesson with its materials
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          contentType: lesson.contentType,
          content: lesson.content, // Full content without truncation
          durationMinutes: lesson.durationMinutes,
          orderIndex: lesson.orderIndex,
          isPublished: lesson.isPublished,
          materials: formattedMaterials
        };
      }));
      
      // Return the module with its lessons and materials
      return {
        id: module.id,
        title: module.title,
        description: module.description,
        orderIndex: module.orderIndex,
        isPublished: module.isPublished,
        lessons: lessonsWithMaterials
      };
    }));
    
    return modulesWithLessons;
  }
} 