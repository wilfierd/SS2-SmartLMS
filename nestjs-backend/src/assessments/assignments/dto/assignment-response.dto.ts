// src/assessments/assignments/dto/assignment-response.dto.ts
export class AssignmentResponseDto {
  id: number;
  title: string;
  description?: string;
  instructions?: string;
  max_points: number;
  due_date: Date;
  allow_late_submissions: boolean;
  allowed_file_types: string;
  max_file_size: number;
  created_at: Date;
  updated_at: Date;
  course_title: string;
  course_id: number;
  lesson_title?: string;
  lesson_id?: number;
  
  // For students
  submission?: {
    id: number;
    date: Date;
    isLate: boolean;
    grade?: number;
    status: string;
  };
  
  // For instructors
  submissions?: Array<{
    id: number;
    studentId: number;
    studentName: string;
    studentEmail: string;
    submissionDate: Date;
    filePath: string;
    fileType: string;
    fileSize: number;
    comments?: string;
    isLate: boolean;
    grade?: number;
    feedback?: string;
    gradedAt?: Date;
  }>;
}