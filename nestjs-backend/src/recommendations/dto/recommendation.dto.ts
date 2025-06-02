import { IsOptional, IsNumber, IsBoolean, IsArray, ArrayNotEmpty, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetRecommendationsDto {
  @ApiProperty({
    description: 'Maximum number of recommendations to return',
    example: 3,
    minimum: 1,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number;

  @ApiProperty({
    description: 'Force refresh of recommendations (bypass cache)',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  refresh?: boolean;
}

export class BatchRecommendationsDto {
  @ApiProperty({
    description: 'Array of student IDs to get recommendations for',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  studentIds: number[];

  @ApiProperty({
    description: 'Maximum number of recommendations per student',
    example: 3,
    minimum: 1,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number;
}
