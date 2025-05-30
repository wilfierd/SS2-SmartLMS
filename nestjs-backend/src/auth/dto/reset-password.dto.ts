import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({
        description: 'Password reset token',
        example: 'abc123def456'
    })
    @IsString()
    @IsNotEmpty()
    token: string;
    @ApiProperty({
        description: 'New password',
        example: 'newPassword123',
        minLength: 8
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    newPassword: string;
}
