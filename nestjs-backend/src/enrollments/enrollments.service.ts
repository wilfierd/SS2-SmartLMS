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

  async enrollStudent(studentId: number, dto: EnrollCourseDto): Promise<EnrollmentResponseDto> {
    // Check if course exists
    const course = await this.coursesService.findOne(dto.courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if course requires enrollment key
    if (course.enrollmentKey && course.enrollmentKey !== dto.enrollmentKey) {
      throw new ForbiddenException('Invalid enrollment key');
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

    // Create enrollment
    const enrollment = this.enrollmentsRepository.create({
      studentId,
      courseId: dto.courseId,
      completionStatus: CompletionStatus.NOT_STARTED,
    });

    const savedEnrollment = await this.enrollmentsRepository.save(enrollment);
    
    // Get course with instructor for response
    const courseWithInstructor = await this.coursesService.findCourseWithDetailsById(dto.courseId);
    
    // Format response
    return this.formatEnrollmentResponse(savedEnrollment, courseWithInstructor);
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

  async findStudentEnrollments(studentId: number): Promise<EnrollmentResponseDto[]> {
    const enrollments = await this.enrollmentsRepository.find({
      where: { studentId },
      relations: ['course', 'course.instructor'],
    });

    return Promise.all(
      enrollments.map(async (enrollment) => {
        const course = await this.coursesService.findOne(enrollment.courseId);
        return this.formatEnrollmentResponse(enrollment, course);
      })
    );
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