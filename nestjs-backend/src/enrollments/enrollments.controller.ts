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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { EnrollmentsService } from './enrollments.service';
import { EnrollCourseDto } from './dto/enroll-course.dto';
import { EnrollmentResponseDto } from './dto/enrollment-response.dto';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('enroll')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  async enrollInCourse(@Request() req, @Body() enrollCourseDto: EnrollCourseDto): Promise<any> {
    return this.enrollmentsService.enrollStudent(req.user.userId, enrollCourseDto);
  }

  @Delete('leave/:courseId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  async leaveCourse(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<{ message: string }> {
    await this.enrollmentsService.leaveCourse(req.user.userId, courseId);
    return { message: 'Successfully left the course' };
  }
  @Get('my-courses')
  async getMyEnrolledCourses(@Request() req): Promise<any[]> {
    return this.enrollmentsService.findStudentEnrollments(req.user.userId);
  }

  @Get('course/:courseId/students')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async getEnrolledStudents(
    @Request() req,
    @Param('courseId', ParseIntPipe) courseId: number,
  ): Promise<any[]> {
    // For instructors, verify they own the course, admins can see all
    const instructorId = req.user.role === UserRole.INSTRUCTOR ? req.user.userId : undefined;
    return this.enrollmentsService.findEnrolledStudentsByCourse(courseId, instructorId);
  }
}
