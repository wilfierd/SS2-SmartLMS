import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
    @ApiProperty({
        description: 'First name of the user',
        maxLength: 100,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiProperty({
        description: 'Last name of the user',
        maxLength: 100,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;

    @ApiProperty({
        description: 'User bio/description',
        required: false,
    })
    @IsOptional()
    @IsString()
    bio?: string;
}
