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
    @Body() createAssignmentDto: CreateAssignmentDto,
    @Request() req: any,
  ) {
    return this.assignmentsService.createAssignment(
      courseId, 
      { ...createAssignmentDto, lessonId }, 
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
  ) {
    return this.assignmentsService.findAssignmentsByCourse(courseId);
  }

  @Get(':assignmentId')
  @UseGuards(JwtAuthGuard)
  async getAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Request() req: any,
  ) {
    if (req.user.role === UserRole.STUDENT) {
      return this.assignmentsService.getStudentAssignmentWithSubmission(
        assignmentId, 
        req.user.userId
      );
    }
    
    return this.assignmentsService.findAssignmentById(assignmentId);
  }

  @Post(':assignmentId/submit')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './backend/uploads/assignments',
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