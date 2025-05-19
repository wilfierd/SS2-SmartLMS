import { Controller, Post, UseInterceptors, UploadedFile, UploadedFiles, Param, Request, Body, UseGuards, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, Logger, Inject, forwardRef } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiParam, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';
import { CoursesService } from '../courses/courses.service';
import { AssignmentsService } from '../assessments/assignments/assignments.service';
import { UserRole } from '../users/entities/user.entity';
import { UpdateCourseDto } from '../courses/dto/update-course.dto';
import { LessonMaterial } from '../courses/entities/lesson-material.entity';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly coursesService: CoursesService,
    @Inject(forwardRef(() => AssignmentsService))
    private readonly assignmentsService: AssignmentsService
  ) {}

  @Post('courses/:courseId/thumbnail')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload course thumbnail' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'courseId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadCourseThumbnail(
    @UploadedFile() file: Express.Multer.File,
    @Param('courseId') courseId: number,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPG, PNG, and GIF are allowed.');
    }

    // Get course to check permissions
    const course = await this.coursesService.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Check if user is instructor of this course or admin
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== UserRole.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this course');
    }

    // Save the file
    const filePath = await this.uploadsService.uploadCourseThumbnail(file);

    // Update course with thumbnail URL
    await this.coursesService.update(
      courseId, 
      { thumbnailUrl: filePath } as UpdateCourseDto,
      userId,
      userRole
    );

    return { 
      thumbnailUrl: filePath
    };
  }

  @Post('lessons/:lessonId/materials')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload lesson materials' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'lessonId', type: Number })
  async uploadLessonMaterials(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('lessonId') lessonId: number,
    @Body() body: { materialType?: string, title?: string },
    @Request() req
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    // Get lesson and check permissions
    const lesson = await this.uploadsService.getLesson(lessonId);
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // Check if lesson belongs to a module and find the course
    const module = await this.coursesService.findModuleById(lesson.moduleId);
    if (!module) {
      throw new NotFoundException(`Module for lesson ID ${lessonId} not found`);
    }
    
    const courseId = module.courseId;
    
    if (req.user.role === UserRole.INSTRUCTOR) {
      await this.coursesService.checkInstructorAccess(courseId, req.user.id);
    }

    const uploadedPaths: string[] = [];
    const materials: LessonMaterial[] = [];

    for (const file of files) {
      try {
        // Save the file
        const filePath = await this.uploadsService.uploadLessonMaterial(file, lessonId);
        uploadedPaths.push(filePath);

        // Create material record in database
        const material = await this.uploadsService.createLessonMaterial({
          lessonId,
          title: body.title || file.originalname,
          filePath,
          fileType: file.mimetype,
          fileSize: file.size,
          materialType: body.materialType || this.uploadsService.getMaterialType(file)
        });

        materials.push(material);
      } catch (error) {
        this.logger.error(`Error uploading file: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
      }
    }

    return {
      message: `${materials.length} material(s) uploaded successfully`,
      materials
    };
  }

  @Post('assignments/:assignmentId/submission')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Submit assignment' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'assignmentId', type: Number })
  async uploadAssignmentSubmission(
    @UploadedFile() file: Express.Multer.File,
    @Param('assignmentId') assignmentId: number,
    @Body() body: { comments?: string },
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Verify assignment exists
    const assignment = await this.assignmentsService.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    // Check allowed file types
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedTypes = assignment.allowedFileTypes.split(',');
    
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${assignment.allowedFileTypes}`);
    }

    // Check due date
    if (assignment.dueDate && new Date() > new Date(assignment.dueDate)) {
      throw new BadRequestException('Assignment submission deadline has passed');
    }

    // Check if student is enrolled in the course
    const studentId = req.user.id;
    const isEnrolled = await this.coursesService.isStudentEnrolled(assignment.courseId, studentId);
    
    if (!isEnrolled) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    // Save the file
    const filePath = await this.uploadsService.uploadAssignmentSubmission(
      file, 
      assignmentId,
      studentId
    );

    // Create submission record in database
    const submission = await this.uploadsService.createSubmission({
      assignmentId,
      studentId,
      filePath,
      fileType: file.mimetype,
      fileSize: file.size,
      comments: body.comments || null,
      submissionDate: new Date(),
    });

    return submission;
  }
} 