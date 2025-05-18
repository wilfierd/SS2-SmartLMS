import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { CoursesService } from '../../courses/courses.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    @InjectRepository(Assignment)
    private assignmentsRepository: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private submissionsRepository: Repository<AssignmentSubmission>,
    private coursesService: CoursesService,
  ) {}

  async createAssignment(courseId: number, dto: CreateAssignmentDto, instructorId: number): Promise<Assignment> {
    // Verify course ownership
    const course = await this.coursesService.findOne(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    
    const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, instructorId);
    if (!isInstructor) {
      throw new ForbiddenException('You can only create assignments for your own courses');
    }

    const assignment = this.assignmentsRepository.create({
      ...dto,
      courseId,
    });

    return this.assignmentsRepository.save(assignment);
  }

  async updateAssignment(assignmentId: number, dto: UpdateAssignmentDto, instructorId: number): Promise<Assignment> {
    const assignment = await this.findAssignmentById(assignmentId);

    const isInstructor = await this.coursesService.isInstructorOfCourse(assignment.courseId, instructorId);
    if (!isInstructor) {
      throw new ForbiddenException('You can only update your own assignments');
    }

    // Update assignment with the provided fields
    Object.assign(assignment, dto);
    return this.assignmentsRepository.save(assignment);
  }

  async deleteAssignment(assignmentId: number, instructorId: number): Promise<void> {
    const assignment = await this.findAssignmentById(assignmentId);

    const isInstructor = await this.coursesService.isInstructorOfCourse(assignment.courseId, instructorId);
    if (!isInstructor) {
      throw new ForbiddenException('You can only delete your own assignments');
    }

    await this.assignmentsRepository.remove(assignment);
  }

  async getSubmissionsForAssignment(assignmentId: number, instructorId: number): Promise<AssignmentSubmission[]> {
    const assignment = await this.findAssignmentById(assignmentId);

    const isInstructor = await this.coursesService.isInstructorOfCourse(assignment.courseId, instructorId);
    if (!isInstructor) {
      throw new ForbiddenException('You can only view submissions for your own assignments');
    }

    return this.submissionsRepository.find({
      where: { assignmentId },
      relations: ['student'],
      order: { submissionDate: 'DESC' },
    });
  }

  async gradeSubmission(submissionId: number, dto: GradeSubmissionDto, instructorId: number): Promise<AssignmentSubmission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['assignment'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const isInstructor = await this.coursesService.isInstructorOfCourse(submission.assignment.courseId, instructorId);
    if (!isInstructor) {
      throw new ForbiddenException('You can only grade submissions for your own assignments');
    }

    // Update submission with grade info
    submission.grade = dto.grade;
    submission.feedback = dto.feedback;
    submission.gradedById = instructorId;
    submission.gradedAt = new Date();

    return this.submissionsRepository.save(submission);
  }

  async submitAssignment(
    assignmentId: number, 
    studentId: number, 
    fileInfo: { path: string; type: string; size: number },
    comments?: string
  ): Promise<AssignmentSubmission> {
    const assignment = await this.findAssignmentById(assignmentId);

    // Check if past due date
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);
    const isLate = now > dueDate;

    // If late and late submissions not allowed
    if (isLate && !assignment.allowLateSubmissions) {
      throw new BadRequestException('Submission deadline has passed');
    }

    // Check file type
    const allowedTypes = assignment.allowedFileTypes.split(',');
    const fileExt = fileInfo.type.split('/')[1].toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    // Check file size (bytes to MB conversion)
    const fileSizeInMB = fileInfo.size / (1024 * 1024);
    if (fileSizeInMB > assignment.maxFileSize) {
      throw new BadRequestException(`File too large. Maximum size: ${assignment.maxFileSize} MB`);
    }

    // Check if student already has a submission and update it if exists
    let submission = await this.submissionsRepository.findOne({
      where: {
        assignmentId,
        studentId,
      },
    });

    if (submission) {
      Object.assign(submission, {
        filePath: fileInfo.path,
        fileType: fileExt,
        fileSize: Math.round(fileInfo.size / 1024), // Convert bytes to KB
        comments: comments || submission.comments,
        isLate,
        // Reset grade info if resubmitting
        grade: null,
        feedback: null,
        gradedById: null,
        gradedAt: null,
      });
    } else {
      // Create new submission
      submission = this.submissionsRepository.create({
        assignmentId,
        studentId,
        filePath: fileInfo.path,
        fileType: fileExt,
        fileSize: Math.round(fileInfo.size / 1024), // Convert bytes to KB
        comments,
        isLate,
      });
    }

    return this.submissionsRepository.save(submission);
  }

  async getStudentAssignmentWithSubmission(assignmentId: number, studentId: number): Promise<any> {
    const assignment = await this.findAssignmentById(assignmentId);
    
    const submission = await this.submissionsRepository.findOne({
      where: {
        assignmentId,
        studentId,
      },
    });

    return {
      assignment,
      submission: submission || null,
    };
  }

  async findAssignmentById(assignmentId: number): Promise<Assignment> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id: assignmentId },
      relations: ['course', 'lesson'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async findAssignmentsByCourse(courseId: number): Promise<Assignment[]> {
    return this.assignmentsRepository.find({
      where: { courseId },
      order: { dueDate: 'ASC' },
    });
  }

  async findById(id: number): Promise<Assignment | null> {
    return this.assignmentsRepository.findOne({
      where: { id }
    });
  }
} 