import { 
  Controller, 
  Post, 
  Put, 
  Delete, 
  Get, 
  Param, 
  Body, 
  UseGuards, 
  Request, 
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post('course/:courseId/lesson/:lessonId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async createAssignment(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() requestBody: any,
    @Request() req: any,
  ) {
    // Map snake_case to camelCase properties
    const createAssignmentDto = {
      lessonId: lessonId,
      title: requestBody.title,
      description: requestBody.description,
      instructions: requestBody.instructions,
      maxPoints: requestBody.max_points || requestBody.maxPoints,
      dueDate: requestBody.due_date || requestBody.dueDate,
      allowedFileTypes: requestBody.allowed_file_types || requestBody.allowedFileTypes,
      maxFileSize: requestBody.max_file_size || requestBody.maxFileSize,
      allowLateSubmissions: requestBody.allow_late_submissions || requestBody.allowLateSubmissions
    };

    console.log('Creating assignment with data:', JSON.stringify(createAssignmentDto));
    return this.assignmentsService.createAssignment(
      courseId, 
      createAssignmentDto, 
      req.user.userId
    );
  }

  @Put(':assignmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async updateAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.updateAssignment(
      assignmentId, 
      updateAssignmentDto, 
      req.user.userId
    );
  }

  @Delete(':assignmentId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async deleteAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Request() req: any,
  ) {
    await this.assignmentsService.deleteAssignment(
      assignmentId, 
      req.user.userId
    );
    return { message: 'Assignment deleted successfully' };
  }

  @Get(':assignmentId/submissions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getSubmissions(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Request() req: any,
  ) {
    return this.assignmentsService.getSubmissionsForAssignment(
      assignmentId, 
      req.user.userId
    );
  }

  @Post('submissions/:submissionId/grade')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async gradeSubmission(
    @Param('submissionId', ParseIntPipe) submissionId: number,
    @Body() gradeSubmissionDto: GradeSubmissionDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.gradeSubmission(
      submissionId, 
      gradeSubmissionDto, 
      req.user.userId
    );
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard)
  async getAssignmentsForCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Request() req: any,
  ) {
    const assignments = await this.assignmentsService.findAssignmentsByCourse(courseId);
    
    // For students, include submission status
    if (req.user.role === UserRole.STUDENT) {
      const studentId = req.user.userId;
      
      // Get submission status for each assignment
      for (let assignment of assignments) {
        const submission = await this.assignmentsService.getStudentAssignmentWithSubmission(
          assignment.id, 
          studentId
        );
        
        if (submission.submission) {
          assignment['submission'] = {
            id: submission.submission.id,
            date: submission.submission.submissionDate,
            isLate: submission.submission.isLate,
            grade: submission.submission.grade,
            status: submission.submission.grade ? 'graded' : 'submitted'
          };
        } else {
          assignment['submission'] = null;
        }
      }
    }
    
    return assignments;
  }

  // FIXED: Enhanced assignment details endpoint
  @Get(':assignmentId')
  @UseGuards(JwtAuthGuard)
  async getAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Request() req: any,
  ) {
    try {
      // Get assignment with full details using the enhanced service method
      const assignment = await this.assignmentsService.getAssignmentWithFullDetails(
        assignmentId, 
        req.user.role,
        req.user.userId
      );

      // Format the response to match exactly what server.js returns
      const response = {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        max_points: assignment.maxPoints,
        due_date: assignment.dueDate,
        allow_late_submissions: assignment.allowLateSubmissions,
        allowed_file_types: assignment.allowedFileTypes,
        max_file_size: assignment.maxFileSize,
        created_at: assignment.createdAt,
        updated_at: assignment.updatedAt,
        course_title: assignment.course.title,
        course_id: assignment.course.id,
        lesson_title: assignment.lesson?.title || null,
        lesson_id: assignment.lesson?.id || null,
      };

      // Add submission-related data based on user role
      if (req.user.role === UserRole.STUDENT) {
        response['submission'] = assignment.studentSubmission;
      } else {
        response['submissions'] = assignment.submissions || [];
      }

      return response;
    } catch (error) {
      console.error('Error fetching assignment:', error);
      throw error;
    }
  }

  @Post(':assignmentId/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/assignments',
        filename: (req: any, file: any, callback: any) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          const userId = (req.user as any).userId;
          const filename = `${userId}-${req.params.assignmentId}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      fileFilter: (req: any, file: any, callback: any) => {
        if (!file.mimetype) {
          return callback(new BadRequestException('File type not detected'), false);
        }
        callback(null, true);
      },
    }),
  )
  async submitAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() submitAssignmentDto: SubmitAssignmentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileInfo = {
      path: file.path,
      type: file.mimetype,
      size: file.size,
    };

    return this.assignmentsService.submitAssignment(
      assignmentId,
      req.user.userId,
      fileInfo,
      submitAssignmentDto.comments
    );
  }
}