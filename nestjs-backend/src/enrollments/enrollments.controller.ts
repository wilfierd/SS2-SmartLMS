import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { EnrollmentsService } from './enrollments.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@ApiTags('enrollments')
@ApiBearerAuth('JWT-auth')
@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) { }

  @Post('enroll')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Enroll in a course (Student only)' })
  @ApiBody({ type: EnrollCourseDto })
  @ApiResponse({ status: 201, description: 'Successfully enrolled in course' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid course or enrollment key' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Student role required' })
  @ApiResponse({ status: 409, description: 'Conflict - Already enrolled' })
  async enrollInCourse(@Request() req, @Body() enrollCourseDto: EnrollCourseDto): Promise<any> {
    return this.enrollmentsService.enrollStudent(req.user.userId, enrollCourseDto);
  }

  @Delete('leave/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Leave a course (Student only)' })
  @ApiParam({ name: 'courseId', type: 'number', description: 'Course ID to leave' })
  @ApiResponse({ status: 200, description: 'Successfully left the course' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Student role required' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async leaveCourse(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<{ message: string }> {
    await this.enrollmentsService.leaveCourse(req.user.userId, courseId);
    return { message: 'Successfully left the course' };
  }

  @Get('my-courses')
  @ApiOperation({ summary: 'Get my enrolled courses' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyEnrolledCourses(@Request() req): Promise<any[]> {
    return this.enrollmentsService.findStudentEnrollments(req.user.userId);
  }

  @Get('course/:courseId/students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get enrolled students for a course (Admin/Instructor only)' })
  @ApiParam({ name: 'courseId', type: 'number', description: 'Course ID' })
  @ApiResponse({ status: 200, description: 'List of enrolled students' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin or Instructor role required' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getEnrolledStudents(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<any[]> {
    // For instructors, verify they own the course, admins can see all
    const instructorId = req.user.role === UserRole.INSTRUCTOR ? req.user.userId : undefined;
    return this.enrollmentsService.findEnrolledStudentsByCourse(courseId, instructorId);
  }
}
