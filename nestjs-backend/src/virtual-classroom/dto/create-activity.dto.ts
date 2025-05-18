import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiProperty({ description: 'ID of the virtual session' })
  @IsNumber()
  @IsNotEmpty()
  sessionId: number;

  @ApiProperty({ description: 'Action performed in the session (join, leave, chat, etc)' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiPropertyOptional({ description: 'Value related to the action (e.g. chat message)' })
  @IsString()
  @IsOptional()
  actionValue?: string;

  @ApiPropertyOptional({ description: 'Device information of the user' })
  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @ApiPropertyOptional({ description: 'IP address of the user' })
  @IsString()
  @IsOptional()
  ipAddress?: string;
} 