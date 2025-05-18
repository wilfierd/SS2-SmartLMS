import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, ValidateNested, ArrayMinSize, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBreakoutRoomsDto {
  @ApiProperty({ description: 'Number of breakout rooms to create' })
  @IsNumber()
  roomCount: number;

  @ApiPropertyOptional({ description: 'Whether to auto-assign participants' })
  @IsBoolean()
  @IsOptional()
  autoAssign?: boolean;

  @ApiPropertyOptional({ description: 'Custom room names' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roomNames?: string[];

  @ApiPropertyOptional({ 
    description: 'Manual participant assignments. Key is room index, value is array of user IDs',
    example: { '0': [1, 2, 3], '1': [4, 5, 6] }
  })
  @IsObject()
  @IsOptional()
  participantAssignments?: Record<string, number[]>;
}

export class BreakoutRoomParticipantResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  participantName: string;

  @ApiProperty()
  joinedAt: Date;

  @ApiPropertyOptional()
  leftAt?: Date;
}

export class BreakoutRoomResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  sessionId: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  endedAt?: Date;

  @ApiProperty({ type: [BreakoutRoomParticipantResponseDto] })
  participants: BreakoutRoomParticipantResponseDto[];
}

export class StudentBreakoutRoomResponseDto {
  @ApiProperty()
  userRoom?: BreakoutRoomResponseDto;

  @ApiProperty()
  isInRoom: boolean;
} 