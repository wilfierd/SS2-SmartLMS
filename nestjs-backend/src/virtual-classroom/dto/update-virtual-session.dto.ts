import { PartialType } from '@nestjs/swagger';
import { CreateVirtualSessionDto } from './create-virtual-session.dto';
import { IsOptional, IsString, IsBoolean, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../entities/virtual-session.entity';

export class UpdateVirtualSessionDto extends PartialType(CreateVirtualSessionDto) {
  @ApiProperty({ description: 'Session status', enum: SessionStatus, required: false })
  @IsOptional()
  status?: SessionStatus;

  @ApiProperty({ description: 'Recording URL', required: false })
  @IsOptional()
  @IsString()
  recordingUrl?: string;
} 