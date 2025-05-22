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

  async create(courseId: number, createCourseModuleDto: CreateCourseModuleDto, userId: number, userRole: UserRole): Promise<any> {
    try {
      // Check if user has permissions to modify this course
      if (userRole === UserRole.INSTRUCTOR) {
        const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
        if (!isInstructor) {
          throw new ForbiddenException('You can only add modules to your own courses');
        }
      }
      
      // Find the next order index if not provided
      let orderIndex = createCourseModuleDto.orderIndex;
      if (orderIndex === undefined) {
        const [result] = await this.courseModulesRepository.query(
          'SELECT MAX(order_index) as max_order FROM course_modules WHERE course_id = ?',
          [courseId]
        );
        orderIndex = (result && result.max_order) ? result.max_order + 1 : 0;
      }
      
      // Insert the module using direct SQL
      const [result] = await this.courseModulesRepository.query(
        `INSERT INTO course_modules 
         (course_id, title, description, order_index, is_published) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          courseId,
          createCourseModuleDto.title,
          createCourseModuleDto.description || null,
          orderIndex,
          createCourseModuleDto.isPublished !== undefined ? (createCourseModuleDto.isPublished ? 1 : 0) : 1
        ]
      );
      
      return { id: result.insertId, ...createCourseModuleDto, courseId, orderIndex };
    } catch (error) {
      console.error('Error creating module:', error.message);
      throw error;
    }
  }

  async findByCourse(courseId: number): Promise<any[]> {
    try {
      return this.courseModulesRepository.query(
        'SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC',
        [courseId]
      );
    } catch (error) {
      console.error('Error finding modules by course:', error.message);
      throw error;
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const [module] = await this.courseModulesRepository.query(
        'SELECT * FROM course_modules WHERE id = ?',
        [id]
      );
      
      if (!module) {
        throw new NotFoundException(`Course module with ID ${id} not found`);
      }
      
      return module;
    } catch (error) {
      console.error('Error finding module by id:', error.message);
      throw error;
    }
  }

  async update(id: number, updateCourseModuleDto: UpdateCourseModuleDto, userId: number, userRole: UserRole): Promise<any> {
    try {
      const module = await this.findOne(id);
      
      // Check if user has permissions to modify this module
      if (userRole === UserRole.INSTRUCTOR) {
        const isInstructor = await this.coursesService.isInstructorOfCourse(module.course_id, userId);
        if (!isInstructor) {
          throw new ForbiddenException('You can only update modules of your own courses');
        }
      }
      
      // Build SQL update query manually
      let query = 'UPDATE course_modules SET ';
      const params = [];
      const setClauses = [];
      
      if (updateCourseModuleDto.title !== undefined) {
        setClauses.push('title = ?');
        params.push(updateCourseModuleDto.title);
      }
      
      if (updateCourseModuleDto.description !== undefined) {
        setClauses.push('description = ?');
        params.push(updateCourseModuleDto.description);
      }
      
      if (updateCourseModuleDto.orderIndex !== undefined) {
        setClauses.push('order_index = ?');
        params.push(updateCourseModuleDto.orderIndex);
      }
      
      if (updateCourseModuleDto.isPublished !== undefined) {
        setClauses.push('is_published = ?');
        params.push(updateCourseModuleDto.isPublished ? 1 : 0);
      }
      
      if (setClauses.length === 0) {
        return module; // Nothing to update
      }
      
      // Add updated_at and WHERE clause
      setClauses.push('updated_at = NOW()');
      query += setClauses.join(', ') + ' WHERE id = ?';
      params.push(id);
      
      // Execute update
      await this.courseModulesRepository.query(query, params);
      
      // Get updated module
      return this.findOne(id);
    } catch (error) {
      console.error('Error updating module:', error.message);
      throw error;
    }
  }

  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    try {
      const module = await this.findOne(id);
      
      // Check if user has permissions to modify this module
      if (userRole === UserRole.INSTRUCTOR) {
        const isInstructor = await this.coursesService.isInstructorOfCourse(module.course_id, userId);
        if (!isInstructor) {
          throw new ForbiddenException('You can only delete modules of your own courses');
        }
      }
      
      const result = await this.courseModulesRepository.query(
        'DELETE FROM course_modules WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        throw new NotFoundException(`Course module with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error removing module:', error.message);
      throw error;
    }
  }

  async getModuleCourseId(moduleId: number): Promise<number> {
    try {
      const module = await this.findOne(moduleId);
      return module.course_id;
    } catch (error) {
      console.error('Error getting module course id:', error.message);
      throw error;
    }
  }

  async findByCourseWithLessons(courseId: number): Promise<any[]> {
    try {
      // First, get all modules for the course using column name 'course_id'
      const modules = await this.courseModulesRepository.query(`
        SELECT * FROM course_modules
        WHERE course_id = ?
        ORDER BY order_index ASC
      `, [courseId]);
      
      // If no modules are found, return empty array
      if (!modules || modules.length === 0) {
        return [];
      }
      
      // For each module, get its lessons and materials
      const modulesWithLessons = await Promise.all(modules.map(async (module) => {
        // Get all lessons for this module with their materials
        const lessons = await this.lessonsRepository.query(`
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
        
        // Format the lessons and materials to match the server.js response
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
            durationMinutes: lesson.duration_minutes,
            orderIndex: lesson.order_index,
            isPublished: lesson.is_published === 1,
            materials
          };
        });
        
        // Return the module with its lessons
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
      console.error('Error in findByCourseWithLessons:', error.message);
      throw error;
    }
  }

  async getConnection() {
    return this.courseModulesRepository.manager.connection;
  }
} 