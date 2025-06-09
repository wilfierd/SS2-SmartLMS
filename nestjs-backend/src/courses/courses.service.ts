import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseResponseDto } from './dto/course-response.dto';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { UserRole } from '../common/enums/user-role.enum';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class CoursesService {
    constructor(
      @InjectRepository(Course)
      private coursesRepository: Repository<Course>,
      private usersService: UsersService,
      private departmentsService: DepartmentsService,
      @Inject(forwardRef(() => EnrollmentsService))
      private enrollmentsService: EnrollmentsService,
      @Inject(forwardRef(() => SearchService))
      private searchService: SearchService,
    ) { } async create(createCourseDto: CreateCourseDto, userId: number, userRole: UserRole): Promise<Course> {
      const course = this.coursesRepository.create(createCourseDto);

      // If user is instructor, set the instructorId to the user's id
      if (userRole === UserRole.INSTRUCTOR) {
        course.instructorId = userId;
      } else if (userRole === UserRole.ADMIN && !createCourseDto.instructorId) {
        // Admin should provide instructorId or it defaults to themselves
        course.instructorId = userId;
      }

      const savedCourse = await this.coursesRepository.save(course);

      // Sync with search index
      try {
        await this.searchService.indexCourse(savedCourse.id);
      } catch (error) {
        console.error('Failed to index course in search:', error);
      }

      return savedCourse;
    }

  async findAll(filters?: { status?: CourseStatus, featured?: boolean }): Promise<Course[]> {
    const queryBuilder = this.coursesRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.department', 'department');

    if (filters?.status) {
      queryBuilder.andWhere('course.status = :status', { status: filters.status });
    }

    if (filters?.featured) {
      queryBuilder.andWhere('course.isFeatured = :isFeatured', { isFeatured: filters.featured });
    }

    queryBuilder.orderBy('course.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async findAllPublicCourses(): Promise<Course[]> {
    return this.findAll({ status: CourseStatus.PUBLISHED });
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id },
      relations: ['instructor', 'department'],
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async findCourseWithDetailsById(id: number): Promise<Course> {
    const course = await this.coursesRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.department', 'department')
      .leftJoinAndSelect('course.modules', 'modules')
      .leftJoinAndSelect('modules.lessons', 'lessons')
      .where('course.id = :id', { id })
      .orderBy('modules.orderIndex', 'ASC')
      .addOrderBy('lessons.orderIndex', 'ASC')
      .getOne();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async findModuleById(moduleId: number): Promise<any> {
    const module = await this.coursesRepository
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.modules', 'module', 'module.id = :moduleId', { moduleId })
      .select(['course.id', 'course.instructorId', 'module.id', 'module.courseId'])
      .getOne();

    if (!module || !module.modules.length) {
      return null;
    }

    return module.modules[0];
  }
  async update(id: number, updateCourseDto: UpdateCourseDto, userId: number, userRole: UserRole): Promise<Course> {
    const course = await this.findOne(id);

    // Check permissions
    if (userRole === UserRole.INSTRUCTOR && course.instructorId !== userId) {
      throw new ForbiddenException('You can only update your own courses');
    }

    // Instructors cannot change instructorId
    if (userRole === UserRole.INSTRUCTOR && updateCourseDto.instructorId) {
      delete updateCourseDto.instructorId;
    }

    // Update course properties
    Object.assign(course, updateCourseDto);

    const updatedCourse = await this.coursesRepository.save(course);

    // Sync with search index
    try {
      await this.searchService.updateCourseIndex(id);
    } catch (error) {
      console.error('Failed to update course in search index:', error);
    }

    return updatedCourse;
  }
  async remove(id: number, userId: number, userRole: UserRole): Promise<void> {
    // Validate input
    if (!id || isNaN(id)) {
      throw new BadRequestException('Invalid course ID');
    }

    const course = await this.findOne(id);

    // Check permissions
    if (userRole === UserRole.INSTRUCTOR && course.instructorId !== userId) {
      throw new ForbiddenException('You can only delete your own courses');
    }

    try {
      const result = await this.coursesRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Course with ID ${id} not found or already deleted`);
      }

      // Remove from search index
      try {
        await this.searchService.removeCourseFromIndex(id);
      } catch (error) {
        console.error('Failed to remove course from search index:', error);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error.code === 'ER_ROW_IS_REFERENCED' || error.code === '23503') {
        // MySQL or PostgreSQL foreign key error codes
        throw new BadRequestException('Cannot delete this course because it is referenced by other entities (e.g., enrollments or modules)');
      } else {
        throw new BadRequestException('Failed to delete course');
      }
    }
  }

  async archive(id: number, userId: number, userRole: UserRole): Promise<Course> {
    const course = await this.findOne(id);

    // Check permissions
    if (userRole === UserRole.INSTRUCTOR && course.instructorId !== userId) {
      throw new ForbiddenException('You can only archive your own courses');
    }

    course.status = CourseStatus.ARCHIVED;

    return this.coursesRepository.save(course);
  }
  async batchDelete(ids: number[], userId: number, userRole: UserRole): Promise<void> {
    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('No course IDs provided for deletion');
    }

    // For instructors, verify they own all courses
    if (userRole === UserRole.INSTRUCTOR) {
      for (const id of ids) {
        const course = await this.findOne(id);
        if (course.instructorId !== userId) {
          throw new ForbiddenException(`You don't have permission to delete course with ID ${id}`);
        }
      }
    }

    const result = await this.coursesRepository.delete(ids);

    if (result.affected === 0) {
      throw new NotFoundException(`No courses were deleted. Courses may not exist.`);
    }

    // Remove from search index
    try {
      await Promise.all(ids.map(id => this.searchService.removeCourseFromIndex(id)));
    } catch (error) {
      console.error('Failed to remove courses from search index:', error);
    }
  }

  async isInstructorOfCourse(courseId: number, instructorId: number): Promise<boolean> {
    const course = await this.coursesRepository.findOne({
      where: { id: courseId, instructorId },
    });
    return !!course;
  }

  async checkInstructorAccess(courseId: number, instructorId: number): Promise<void> {
    const hasAccess = await this.isInstructorOfCourse(courseId, instructorId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied: You can only manage resources for your own courses');
    }
  }

  async toCourseResponseDto(course: Course): Promise<CourseResponseDto> {
    // Get instructor name
    let instructorName = '';
    if (course.instructor) {
      instructorName = `${course.instructor.firstName} ${course.instructor.lastName}`;
    } else if (course.instructorId) {
      try {
        const instructor = await this.usersService.findOne(course.instructorId);
        instructorName = `${instructor.firstName} ${instructor.lastName}`;
      } catch (error) {
        // Instructor not found
      }
    }

    // Get department name
    let departmentName = '';
    if (course.department) {
      departmentName = course.department.name;
    } else if (course.departmentId) {
      try {
        const department = await this.departmentsService.findOne(course.departmentId);
        departmentName = department.name;
      } catch (error) {
        // Department not found
      }
    }

    return {
      id: course.id,
      code: course.code,
      title: course.title,
      description: course.description,
      thumbnailUrl: course.thumbnailUrl,
      status: course.status,
      enrollmentKey: course.enrollmentKey,
      startDate: course.startDate,
      endDate: course.endDate,
      isFeatured: course.isFeatured,
      instructorId: course.instructorId,
      instructorName,
      departmentId: course.departmentId,
      departmentName,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };
  }

  async isStudentEnrolled(courseId: number, studentId: number): Promise<boolean> {
    const enrollment = await this.enrollmentsService.findEnrollment(
      courseId,
      studentId
    );

    return !!enrollment;
  }
} 