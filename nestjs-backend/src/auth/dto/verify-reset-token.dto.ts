import { ApiProperty } from '@nestjs/swagger';

export class VerifyResetTokenResponseDto {
    @ApiProperty({
        description: 'Whether the token is valid',
        example: true
    })
    valid: boolean;

    @ApiProperty({
        description: 'Response message',
        example: 'Token is valid'
    })
    message: string;

    @ApiProperty({
        description: 'User information if token is valid',
        required: false
    })
    user?: {
        id: number;
        email: string;
    };
}
