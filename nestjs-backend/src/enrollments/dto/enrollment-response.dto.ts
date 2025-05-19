import { CompletionStatus } from '../entities/enrollment.entity';

export class EnrollmentResponseDto {
  // Course ID
  id: number;
  // Basic course info
  title: string;
  code: string;
  description?: string;
  instructor: string;
  thumbnailUrl?: string;
  status: string;
  startDate: Date;
  endDate: Date;
} 