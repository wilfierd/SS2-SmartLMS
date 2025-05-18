import { IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchDeleteUsersDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  userIds: number[];
} 