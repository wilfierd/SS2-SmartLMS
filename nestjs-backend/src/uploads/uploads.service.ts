import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Assignment } from '../assessments/assignments/entities/assignment.entity';
import { AssignmentSubmission } from '../assessments/assignments/entities/assignment-submission.entity';
import { User } from '../users/entities/user.entity';
import { LessonMaterial } from '../courses/entities/lesson-material.entity';
import { Lesson } from '../courses/entities/lesson.entity';
import { Course } from '../courses/entities/course.entity';
import { MaterialType } from '../courses/entities/lesson-material.entity';

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

@Injectable()
export class UploadsService {
  private readonly uploadsDir: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepository: Repository<AssignmentSubmission>,
    @InjectRepository(LessonMaterial)
    private readonly materialRepository: Repository<LessonMaterial>,
    @InjectRepository(Lesson)
    private readonly lessonRepository: Repository<Lesson>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {
    this.uploadsDir = this.configService.get<string>('UPLOADS_DIR', './uploads');
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir(): Promise<void> {
    const dirs = [
      this.uploadsDir,
      `${this.uploadsDir}/courses`,
      `${this.uploadsDir}/lessons`,
      `${this.uploadsDir}/assignments`
    ];

    for (const dir of dirs) {
      if (!(await existsAsync(dir))) {
        await mkdirAsync(dir, { recursive: true });
      }
    }
  }

  async uploadCourseThumbnail(file: Express.Multer.File): Promise<string> {
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      throw new BadRequestException('Invalid file name');
    }

    // Only accept image files
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];
    if (!allowedTypes.includes(fileExt)) {
      throw new BadRequestException('Invalid file type. Only JPG, PNG, and GIF are allowed.');
    }

    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    const uploadPath = path.join(this.uploadsDir, 'courses', uniqueFilename);
    
    // Write file to disk
    fs.writeFileSync(uploadPath, file.buffer);
    
    // Return the relative path from the uploads directory
    return `/uploads/courses/${uniqueFilename}`;
  }

  async uploadAssignmentSubmission(
    file: Express.Multer.File, 
    assignmentId: number,
    studentId: number
  ): Promise<string> {
    // Generate directory path for this assignment's submissions
    const dirPath = path.join(this.uploadsDir, 'assignments', assignmentId.toString(), studentId.toString());
    
    if (!(await existsAsync(dirPath))) {
      await mkdirAsync(dirPath, { recursive: true });
    }
    
    // Get file extension
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      throw new BadRequestException('Invalid file name');
    }
    
    // Generate unique filename
    const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
    const uploadPath = path.join(dirPath, uniqueFilename);
    
    // Write file to disk
    fs.writeFileSync(uploadPath, file.buffer);
    
    // Return the relative path from the uploads directory
    return `/uploads/assignments/${assignmentId}/${studentId}/${uniqueFilename}`;
  }

  async uploadLessonMaterial(file: Express.Multer.File, lessonId: number): Promise<string> {
    // Generate directory path for this lesson's materials
    const dirPath = path.join(this.uploadsDir, 'lessons', lessonId.toString());
    
    if (!(await existsAsync(dirPath))) {
      await mkdirAsync(dirPath, { recursive: true });
    }
    
    // Generate unique filename (keep original name but add timestamp to avoid conflicts)
    const safeName = file.originalname.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueFilename = `${Date.now()}-${safeName}`;
    const uploadPath = path.join(dirPath, uniqueFilename);
    
    // Write file to disk
    fs.writeFileSync(uploadPath, file.buffer);
    
    // Return the relative path from the uploads directory
    return `/uploads/lessons/${lessonId}/${uniqueFilename}`;
  }

  async getLesson(lessonId: number): Promise<Lesson | null> {
    return this.lessonRepository.findOne({
      where: { id: lessonId },
      relations: ['course']
    });
  }

  async getLessonMaterials(lessonId: number): Promise<LessonMaterial[]> {
    return this.materialRepository.find({
      where: { lessonId },
      order: {
        createdAt: 'ASC'
      }
    });
  }

  getMaterialType(file: Express.Multer.File): string {
    const mimeType = file.mimetype;
    
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if ([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(mimeType)) {
      return 'document';
    } else if ([
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ].includes(mimeType)) {
      return 'presentation';
    } else {
      return 'other';
    }
  }

  async createLessonMaterial(materialData: {
    lessonId: number;
    title: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    materialType: string;
  }): Promise<LessonMaterial> {
    const material = new LessonMaterial();
    material.lessonId = materialData.lessonId;
    material.title = materialData.title;
    material.filePath = materialData.filePath;
    material.materialType = materialData.materialType as any;
    
    // Save the material (without the non-entity properties)
    return this.materialRepository.save(material);
  }

  async createSubmission(submissionData: {
    assignmentId: number;
    studentId: number;
    filePath: string;
    fileType: string;
    fileSize: number;
    comments?: string | null;
    submissionDate: Date;
  }): Promise<AssignmentSubmission> {
    const submission = new AssignmentSubmission();
    submission.assignmentId = submissionData.assignmentId;
    submission.studentId = submissionData.studentId;
    submission.filePath = submissionData.filePath;
    submission.submissionDate = submissionData.submissionDate;
    submission.isLate = false; // Default value
    submission.comments = submissionData.comments || undefined;
    
    // Handle nullable fields correctly - use 0 or null for numeric fields
    submission.grade = 0;
    submission.feedback = undefined;
    submission.gradedAt = undefined;
    submission.gradedById = 0;
    
    return this.submissionRepository.save(submission);
  }

  async saveLessonMaterial(materialData: {
    lessonId: number;
    title: string;
    filePath?: string;
    externalUrl?: string;
    materialType: string;
  }): Promise<LessonMaterial> {
    const material = new LessonMaterial();
    material.lessonId = materialData.lessonId;
    material.title = materialData.title;
    material.filePath = materialData.filePath || '';
    material.externalUrl = materialData.externalUrl || '';
    material.materialType = materialData.materialType as MaterialType;
    
    return this.materialRepository.save(material);
  }

  async saveAssignmentSubmission(submissionData: {
    assignmentId: number;
    studentId: number;
    filePath: string;
    fileType: string;
    fileSize: number;
    comments?: string;
    isLate: boolean;
  }): Promise<AssignmentSubmission> {
    const submission = new AssignmentSubmission();
    submission.assignmentId = submissionData.assignmentId;
    submission.studentId = submissionData.studentId;
    submission.filePath = submissionData.filePath;
    submission.isLate = submissionData.isLate;
    submission.submissionDate = new Date();
    submission.comments = submissionData.comments || undefined;
    
    return this.submissionRepository.save(submission);
  }
} 