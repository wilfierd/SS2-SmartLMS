import { BadRequestException, Injectable, NotFoundException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment, CompletionStatus } from './entities/enrollment.entity';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';
import { CoursesService } from '../courses/courses.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    @InjectRepository(Enrollment)
    private enrollmentsRepository: Repository<Enrollment>,
    @Inject(forwardRef(() => CoursesService))
    private coursesService: CoursesService,
  ) {}

  async enrollStudent(studentId: number, dto: EnrollCourseDto): Promise<any> {
    try {
      // Validate courseId
      if (!dto.courseId) {
        throw new BadRequestException('Course ID is required');
      }

      // Check if course exists
      const course = await this.coursesService.findOne(dto.courseId);
      if (!course) {
        throw new NotFoundException('Course not found');
      }

      // Check if student is already enrolled
      const existingEnrollment = await this.enrollmentsRepository.findOne({
        where: {
          studentId,
          courseId: dto.courseId,
        },
      });

      if (existingEnrollment) {
        throw new BadRequestException('You are already enrolled in this course');
      }

      // Check if course requires enrollment key
      if (course.enrollmentKey && course.enrollmentKey !== dto.enrollmentKey) {
        throw new ForbiddenException('Invalid enrollment key');
      }

      // Enroll the student using a direct SQL query that mirrors server.js
      await this.enrollmentsRepository.query(
        'INSERT INTO enrollments (student_id, course_id, completion_status) VALUES (?, ?, ?)',
        [studentId, dto.courseId, 'not_started']
      );
      
      return { message: 'Successfully enrolled in course' };
    } catch (error) {
      this.logger.error(`Error enrolling in course: ${error.message}`, error.stack);
      throw error;
    }
  }

  async leaveCourse(studentId: number, courseId: number): Promise<void> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId,
        courseId,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    await this.enrollmentsRepository.remove(enrollment);
  }

  async findStudentEnrollments(studentId: number): Promise<any[]> {
    try {
      // Use a raw SQL query that matches server.js
      const enrollments = await this.enrollmentsRepository.query(`
        SELECT c.*, 
               u.first_name, u.last_name, 
               e.enrollment_date, e.completion_status
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON c.instructor_id = u.id
        WHERE e.student_id = ?
        ORDER BY e.enrollment_date DESC
      `, [studentId]);
      
      // Format the response to match server.js
      return enrollments.map(course => ({
        id: course.id,
        code: course.code,
        title: course.title,
        instructor: `${course.first_name} ${course.last_name}`,
        instructorId: course.instructor_id,
        department: course.department_id,
        description: course.description,
        startDate: course.start_date ? new Date(course.start_date).toISOString().split('T')[0] : null,
        endDate: course.end_date ? new Date(course.end_date).toISOString().split('T')[0] : null,
        status: course.status ? (course.status.charAt(0).toUpperCase() + course.status.slice(1)) : 'Draft',
        thumbnail: course.thumbnail_url,
        enrollmentDate: course.enrollment_date,
        completionStatus: course.completion_status
      }));
    } catch (error) {
      this.logger.error(`Error fetching enrolled courses: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findEnrolledStudentsByCourse(courseId: number, instructorId?: number): Promise<any[]> {
    // If instructorId is provided, verify course ownership
    if (instructorId) {
      const course = await this.coursesService.findOne(courseId);
      if (!course) {
        throw new NotFoundException('Course not found');
      }
      
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, instructorId);
      if (!isInstructor) {
        throw new ForbiddenException('You can only view students for your own courses');
      }
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: { courseId },
      relations: ['student'],
    });

    return enrollments.map(enrollment => ({
      id: enrollment.id,
      studentId: enrollment.studentId,
      enrollmentDate: enrollment.enrollmentDate,
      completionStatus: enrollment.completionStatus,
      completionDate: enrollment.completionDate,
      student: {
        id: enrollment.student.id,
        email: enrollment.student.email,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
      },
    }));
  }

  async findEnrollment(courseId: number, studentId: number): Promise<Enrollment | null> {
    return this.enrollmentsRepository.findOne({
      where: {
        courseId,
        studentId
      }
    });
  }

  private formatEnrollmentResponse(enrollment: Enrollment, course: any): EnrollmentResponseDto {
    // Determine instructor display name
    let instructorName = 'Unknown';
    if (course.instructor) {
      instructorName = `${course.instructor.firstName} ${course.instructor.lastName}`;
    }

    // Return only course-level fields matching UI expectations
    return {
      id: course.id,
      title: course.title,
      code: course.code,
      description: course.description,
      instructor: instructorName,
      thumbnailUrl: course.thumbnailUrl,
      status: course.status,
      startDate: course.startDate,
      endDate: course.endDate,
    };
  }
} 