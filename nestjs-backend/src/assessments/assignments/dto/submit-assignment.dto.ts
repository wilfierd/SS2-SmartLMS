import { IsString, IsOptional } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @IsOptional()
  comments?: string;
  
  // The file will be handled by Multer middleware
} 