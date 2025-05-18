import { CourseStatus } from '../entities/course.entity';

export class CourseResponseDto {
  id: number;
  code: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: CourseStatus;
  enrollmentKey?: string;
  startDate?: Date;
  endDate?: Date;
  isFeatured: boolean;
  instructorId: number;
  instructorName?: string; // This will be populated from the instructor relation
  departmentId?: number;
  departmentName?: string; // This will be populated from the department relation
  createdAt: Date;
  updatedAt: Date;
} 