import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsDateString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SessionActivityDto {
  @ApiProperty({ description: 'Session ID' })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: 'The type of activity', example: 'join' })
  @IsString()
  action: string;

  @ApiProperty({ description: 'Additional value associated with the action', example: 'camera_on', required: false })
  @IsOptional()
  @IsString()
  actionValue?: string;

  @ApiProperty({ description: 'Device information', required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class PollOptionDto {
  @ApiProperty({ description: 'Option text', example: 'Option 1' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Whether this option is correct (for graded polls)', required: false })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;
}

export class CreatePollDto {
  @ApiProperty({ description: 'Session ID' })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ description: 'Poll question', example: 'What is your favorite color?' })
  @IsString()
  question: string;

  @ApiProperty({ type: [PollOptionDto], description: 'Poll options' })
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options: PollOptionDto[];

  @ApiProperty({ description: 'Whether responses are anonymous', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiProperty({ description: 'Whether multiple options can be selected', default: false })
  @IsOptional()
  @IsBoolean()
  isMultipleChoice?: boolean;
}

export class PollResponseDto {
  @ApiProperty({ description: 'Poll ID', example: 1 })
  @IsNumber()
  pollId: number;

  @ApiProperty({ description: 'Option ID', example: 1 })
  @IsNumber()
  optionId: number;
} 