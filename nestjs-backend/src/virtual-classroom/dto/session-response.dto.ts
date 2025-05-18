import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionStatus } from '../entities/virtual-session.entity';
import { RegistrationStatus } from '../entities/session-registration.entity';

export class SessionRegistrationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  registrationDate: Date;

  @ApiProperty({ enum: RegistrationStatus })
  status: RegistrationStatus;
}

export class SessionResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  roomId: string;

  @ApiProperty()
  courseId: number;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty()
  instructorId: number;

  @ApiProperty()
  instructorName: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  sessionDate?: Date;

  @ApiProperty()
  startTime?: string;

  @ApiProperty()
  endTime?: string;

  @ApiPropertyOptional()
  actualStartTime?: Date;

  @ApiPropertyOptional()
  actualEndTime?: Date;

  @ApiProperty({ enum: SessionStatus })
  status: SessionStatus;

  @ApiProperty()
  maxParticipants: number;

  @ApiProperty()
  isRecorded: boolean;

  @ApiPropertyOptional()
  recordingUrl?: string;

  @ApiProperty()
  participantCount: number;

  @ApiPropertyOptional({ enum: RegistrationStatus })
  enrollmentStatus?: RegistrationStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class SessionDetailsResponseDto extends SessionResponseDto {
  @ApiPropertyOptional({ type: [SessionRegistrationResponseDto] })
  participants?: SessionRegistrationResponseDto[];

  @ApiPropertyOptional()
  settings?: any;

  @ApiPropertyOptional()
  analytics?: {
    uniqueParticipants?: number;
    averageDuration?: number;
    maxDuration?: number;
  };
} 