import { CompletionStatus } from '../entities/enrollment.entity';

export class EnrollmentResponseDto {
  // Course ID
  id: number;
  // Basic course info
  title: string;
  code: string;
  description?: string;
  instructor: string;
  thumbnail?: string;
  status: string;
  startDate: Date;
  endDate: Date;
} 