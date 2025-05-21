import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString, IsEnum, ValidateNested, IsUUID, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RecurrenceType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly'
}

export class SessionSettingsDto {
  @ApiPropertyOptional({ description: 'Allow chat in session' })
  @IsBoolean()
  @IsOptional()
  allowChat?: boolean;

  @ApiPropertyOptional({ description: 'Allow screen sharing' })
  @IsBoolean()
  @IsOptional()
  allowScreenSharing?: boolean;

  @ApiPropertyOptional({ description: 'Allow participants to unmute themselves' })
  @IsBoolean()
  @IsOptional()
  allowSelfUnmute?: boolean;

  @ApiPropertyOptional({ description: 'Automatically record session' })
  @IsBoolean()
  @IsOptional()
  autoStartRecording?: boolean;
}

export class RecurrenceDto {
  @ApiProperty({ enum: RecurrenceType, description: 'Type of recurrence pattern' })
  @IsEnum(RecurrenceType)
  type: RecurrenceType;

  @ApiPropertyOptional({ description: 'Day of week (0-6, Sunday to Saturday)' })
  @IsNumber()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @ApiPropertyOptional({ description: 'Week of month (for monthly recurrence)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  weekOfMonth?: number;

  @ApiPropertyOptional({ description: 'End date for recurring sessions' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class CreateVirtualSessionDto {
  @ApiProperty({ description: 'Title of the session' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Course ID this session belongs to' })
  @IsNumber()
  courseId: number;

  @ApiPropertyOptional({ description: 'Description of the session' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Date of the session (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  sessionDate?: string;

  @ApiPropertyOptional({ description: 'Start time of the session (HH:MM)' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time of the session (HH:MM)' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Password to join the session' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Maximum number of participants' })
  @IsNumber()
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional({ description: 'Whether the session should be recorded' })
  @IsBoolean()
  @IsOptional()
  isRecorded?: boolean;

  @ApiPropertyOptional({ description: 'Start session immediately' })
  @IsBoolean()
  @IsOptional()
  startNow?: boolean;

  @ApiPropertyOptional({ description: 'Recurrence settings for recurring sessions' })
  @ValidateNested()
  @Type(() => RecurrenceDto)
  @IsOptional()
  recurrence?: RecurrenceDto;

  @ApiPropertyOptional({ description: 'Custom settings for the session' })
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  @IsOptional()
  settings?: SessionSettingsDto;

  @ApiPropertyOptional({ description: 'Custom room ID (if not provided, one will be generated)' })
  @IsUUID()
  @IsOptional()
  roomId?: string;
} 