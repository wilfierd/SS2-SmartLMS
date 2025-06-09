import { Controller, Post, Get, UseInterceptors, UploadedFile, UploadedFiles, Param, Request, Body, UseGuards, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException, Logger, Inject, forwardRef, Res, StreamableFile } from '@nestjs/common';
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
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

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
  ) { }

  @Post('thumbnail')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiOperation({ summary: 'Upload thumbnail (for course creation)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadThumbnail(
    @UploadedFile() file: Express.Multer.File,
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

    try {
      // Save the file (this will be a temporary upload until course is created)
      const filePath = await this.uploadsService.uploadCourseThumbnail(file);

      return {
        thumbnailUrl: filePath
      };
    } catch (error) {
      this.logger.error('Error uploading thumbnail:', error);
      throw new InternalServerErrorException('Failed to upload thumbnail');
    }
  }
  @Post('courses/:courseId/thumbnail')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('thumbnail'))
  @ApiOperation({ summary: 'Upload course thumbnail' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'courseId', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
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

  @Post('course-material')
  @UseGuards(RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('files'))
  @ApiOperation({ summary: 'Upload course materials (generic)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        courseId: {
          type: 'number',
          description: 'Course ID',
        },
        materialType: {
          type: 'string',
          description: 'Type of material',
          enum: ['document', 'video', 'audio', 'image', 'other'],
        },
        title: {
          type: 'string',
          description: 'Title for the materials',
        },
      },
    },
  })
  async uploadCourseMaterial(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body: { courseId: string, materialType?: string, title?: string },
    @Request() req
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (!body.courseId) {
      throw new BadRequestException('Course ID is required');
    }

    const courseId = parseInt(body.courseId);

    // Get course and check permissions
    const course = await this.coursesService.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Check if user is instructor of this course or admin
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== UserRole.ADMIN && course.instructorId !== userId) {
      throw new ForbiddenException('You do not have permission to upload materials to this course');
    }

    const uploadedFiles: any[] = [];

    for (const file of files) {
      try {
        // Save the file to course materials directory
        const filePath = await this.uploadsService.uploadCourseMaterial(file, courseId);

        uploadedFiles.push({
          originalName: file.originalname,
          filePath,
          fileType: file.mimetype,
          fileSize: file.size,
          materialType: body.materialType || this.uploadsService.getMaterialType(file),
          title: body.title || file.originalname,
        });
      } catch (error) {
        this.logger.error(`Error uploading file: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Failed to upload file: ${error.message}`);
      }
    }

    return {
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
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

  @Get('download/:type/:filename')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download a file with proper headers to force download' })
  @ApiParam({ name: 'type', description: 'File type (assignments, lessons, courses)' })
  @ApiParam({ name: 'filename', description: 'Name of the file to download' })
  async downloadFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
    @Request() req
  ) {
    // Validate file type
    const allowedTypes = ['assignments', 'lessons', 'courses'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException('Invalid file type');
    }

    // Construct file path
    const uploadsDir = join(__dirname, '..', '..', 'uploads');
    const filePath = join(uploadsDir, type, filename);

    // Check if file exists
    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    // Set headers to force download
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    const file = createReadStream(filePath);
    return new StreamableFile(file);
  }
  @Get('download/submission/:submissionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download a submission file' })
  @ApiParam({ name: 'submissionId', description: 'ID of the submission' })
  async downloadSubmissionFile(
    @Param('submissionId') submissionId: number,
    @Res({ passthrough: true }) res: Response,
    @Request() req
  ) {
    try {
      // For now, let's use a simplified approach using the DataSource
      // In a real implementation, you'd add a method to AssignmentsService

      // Check if file exists in the typical uploads/assignments directory
      const uploadsDir = join(__dirname, '..', '..', 'uploads', 'assignments');

      // Find files that match the submission pattern
      const fs = require('fs');
      const files = fs.readdirSync(uploadsDir).filter(file =>
        file.includes(`-${submissionId}-`)
      );

      if (files.length === 0) {
        throw new NotFoundException('Submission file not found');
      }

      const filename = files[0]; // Take the first matching file
      const filePath = join(uploadsDir, filename);

      // Check if file exists
      if (!existsSync(filePath)) {
        throw new NotFoundException('File not found on server');
      }

      // Set headers to force download
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });

      const file = createReadStream(filePath);
      return new StreamableFile(file);
    } catch (error) {
      this.logger.error(`Error downloading submission file: ${error.message}`);
      if (error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to download file');
    }
  }

  @Get('download/material/:materialId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download a lesson material file' })
  @ApiParam({ name: 'materialId', description: 'ID of the lesson material' })
  async downloadMaterialFile(
    @Param('materialId') materialId: number,
    @Res({ passthrough: true }) res: Response,
    @Request() req
  ) {
    try {
      // Get the material from database to check permissions and get file path
      const material = await this.uploadsService.getLessonMaterial(materialId);
      if (!material) {
        throw new NotFoundException('Material not found');
      }

      // Get lesson and module to check permissions
      const lesson = await this.uploadsService.getLesson(material.lessonId);
      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      const module = await this.coursesService.findModuleById(lesson.moduleId);
      if (!module) {
        throw new NotFoundException('Module not found');
      }

      // Check if user has access to this course
      const courseId = module.courseId;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Admins have access to everything
      if (userRole !== UserRole.ADMIN) {
        // Check if instructor owns the course
        if (userRole === UserRole.INSTRUCTOR) {
          await this.coursesService.checkInstructorAccess(courseId, userId);
        } else if (userRole === UserRole.STUDENT) {
          // Check if student is enrolled in the course
          const isEnrolled = await this.coursesService.isStudentEnrolled(courseId, userId);
          if (!isEnrolled) {
            throw new ForbiddenException('You are not enrolled in this course');
          }
        } else {
          throw new ForbiddenException('Access denied');
        }
      }

      // Handle external URLs (e.g., video links)
      if (material.externalUrl) {
        throw new BadRequestException('Cannot download external URLs');
      }      // Construct file path from material.filePath
      const uploadsDir = join(__dirname, '..', '..', 'uploads');

      // Remove /uploads/ prefix if it exists, since we're already joining with uploadsDir
      const relativePath = material.filePath.startsWith('/uploads/')
        ? material.filePath.substring('/uploads/'.length)
        : material.filePath;

      const filePath = join(uploadsDir, relativePath);

      // Debug logging
      this.logger.log(`Material filePath: ${material.filePath}`);
      this.logger.log(`Relative path: ${relativePath}`);
      this.logger.log(`Full file path: ${filePath}`);
      this.logger.log(`Uploads directory: ${uploadsDir}`);      // Check if file exists
      if (!existsSync(filePath)) {
        this.logger.error(`File not found at path: ${filePath}`);
        throw new NotFoundException('File not found on server');
      }

      // Extract filename from file path and ensure proper encoding
      const originalFilename = material.title || material.filePath.split('/').pop() || 'download';

      // Detect file type for proper content type
      const fs = require('fs');
      const stats = fs.statSync(filePath);
      const mimeType = this.getMimeType(filePath);

      this.logger.log(`File stats - Size: ${stats.size} bytes, Type: ${mimeType}`);

      // Encode filename properly for Vietnamese characters
      const encodedFilename = encodeURIComponent(originalFilename);

      // Set headers to force download with proper encoding
      res.set({
        'Content-Type': mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}; filename="${originalFilename}"`,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'no-cache',
      });

      // Create read stream with proper options
      const file = createReadStream(filePath);
      return new StreamableFile(file);
    } catch (error) {
      this.logger.error(`Error downloading material file: ${error.message}`);
      if (error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to download file');
    }
  }

  private getMimeType(filePath: string): string {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();

    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}