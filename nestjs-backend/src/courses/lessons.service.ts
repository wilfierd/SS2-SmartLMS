import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import { LessonMaterial } from './entities/lesson-material.entity';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonMaterialDto } from './dto/create-lesson-material.dto';
import { UpdateLessonMaterialDto } from './dto/update-lesson-material.dto';
import { CourseModulesService } from './course-modules.service';
import { CoursesService } from './courses.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonsRepository: Repository<Lesson>,
    @InjectRepository(LessonMaterial)
    private lessonMaterialsRepository: Repository<LessonMaterial>,
    private courseModulesService: CourseModulesService,
    private coursesService: CoursesService,
  ) {}

  async create(createLessonDto: CreateLessonDto, userId: number, userRole: UserRole): Promise<Lesson> {
    const { moduleId } = createLessonDto;
    
    // Get the course ID from the module
    const courseId = await this.courseModulesService.getModuleCourseId(moduleId);
    
    // Check if user has permissions to modify this course
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only add lessons to your own courses');
      }
    }
    
    // Find the next order index if not provided
    let { orderIndex } = createLessonDto;
    if (orderIndex === undefined) {
      const lastLesson = await this.lessonsRepository.findOne({
        where: { moduleId },
        order: { orderIndex: 'DESC' },
      });
      orderIndex = lastLesson ? lastLesson.orderIndex + 1 : 0;
    }
    
    const lesson = this.lessonsRepository.create({
      ...createLessonDto,
      orderIndex,
    });
    
    return this.lessonsRepository.save(lesson);
  }

  async findByModule(moduleId: number): Promise<Lesson[]> {
    return this.lessonsRepository.find({
      where: { moduleId },
      order: { orderIndex: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Lesson> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id },
      relations: ['module', 'module.course'],
    });
    
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
    
    return lesson;
  }

  async update(id: number, updateLessonDto: UpdateLessonDto, userId: number, userRole: UserRole): Promise<Lesson> {
    const lesson = await this.findOne(id);
    
    // Get the course ID 
    const courseId = lesson.module.courseId;
    
    // Check if user has permissions to modify this lesson
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only update lessons of your own courses');
      }
    }
    
    // If moduleId is changing, verify permission for the new module too
    if (updateLessonDto.moduleId && updateLessonDto.moduleId !== lesson.moduleId) {
      const newModuleCourseId = await this.courseModulesService.getModuleCourseId(updateLessonDto.moduleId);
      
      if (userRole === UserRole.INSTRUCTOR) {
        const hasPermission = await this.coursesService.isInstructorOfCourse(newModuleCourseId, userId);
        if (!hasPermission) {
          throw new ForbiddenException('You can only move lessons to modules of your own courses');
        }
      }
    }
    
    // Update lesson properties
    Object.assign(lesson, updateLessonDto);
    
    return this.lessonsRepository.save(lesson);
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    const lesson = await this.findOne(id);
    
    // Get the course ID
    const courseId = lesson.module.courseId;
    
    // Check if user has permissions to modify this lesson
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only delete lessons of your own courses');
      }
    }
    
    const result = await this.lessonsRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }
  }

  // Lesson Materials methods
  async addMaterial(createLessonMaterialDto: CreateLessonMaterialDto, userId: number, userRole: UserRole): Promise<LessonMaterial> {
    const { lessonId } = createLessonMaterialDto;
    
    // Get lesson and check permissions
    const lesson = await this.findOne(lessonId);
    const courseId = lesson.module.courseId;
    
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only add materials to lessons of your own courses');
      }
    }
    
    const material = this.lessonMaterialsRepository.create(createLessonMaterialDto);
    return this.lessonMaterialsRepository.save(material);
  }

  async findMaterialsByLesson(lessonId: number): Promise<LessonMaterial[]> {
    return this.lessonMaterialsRepository.find({
      where: { lessonId },
    });
  }

  async findOneMaterial(id: number): Promise<LessonMaterial> {
    const material = await this.lessonMaterialsRepository.findOne({
      where: { id },
      relations: ['lesson', 'lesson.module', 'lesson.module.course'],
    });
    
    if (!material) {
      throw new NotFoundException(`Lesson material with ID ${id} not found`);
    }
    
    return material;
  }

  async updateMaterial(id: number, updateLessonMaterialDto: UpdateLessonMaterialDto, userId: number, userRole: UserRole): Promise<LessonMaterial> {
    const material = await this.findOneMaterial(id);
    
    // Get the course ID
    const courseId = material.lesson.module.courseId;
    
    // Check if user has permissions to modify this material
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only update materials of your own courses');
      }
    }
    
    // If lessonId is changing, verify permission for the new lesson too
    if (updateLessonMaterialDto.lessonId && updateLessonMaterialDto.lessonId !== material.lessonId) {
      const newLesson = await this.findOne(updateLessonMaterialDto.lessonId);
      const newCourseId = newLesson.module.courseId;
      
      if (userRole === UserRole.INSTRUCTOR) {
        const hasPermission = await this.coursesService.isInstructorOfCourse(newCourseId, userId);
        if (!hasPermission) {
          throw new ForbiddenException('You can only move materials to lessons of your own courses');
        }
      }
    }
    
    // Update material properties
    Object.assign(material, updateLessonMaterialDto);
    
    return this.lessonMaterialsRepository.save(material);
  }

  async removeMaterial(id: number, userId: number, userRole: UserRole): Promise<void> {
    const material = await this.findOneMaterial(id);
    
    // Get the course ID
    const courseId = material.lesson.module.courseId;
    
    // Check if user has permissions to modify this material
    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only delete materials of your own courses');
      }
    }
    
    const result = await this.lessonMaterialsRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Lesson material with ID ${id} not found`);
    }
  }
} 