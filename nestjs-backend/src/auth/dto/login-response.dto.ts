import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class LoginUserDto {
  @ApiProperty({ description: 'User ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'User email', example: 'admin@smartlms.com' })
  email: string;

  @ApiProperty({ description: 'User first name', example: 'Admin' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'User' })
  lastName: string;

  @ApiProperty({ description: 'User role', enum: UserRole, example: UserRole.ADMIN })
  role: UserRole;

  @ApiProperty({ description: 'Whether user has changed default password', example: true })
  isPasswordChanged: boolean;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  token: string;

  @ApiProperty({
    description: 'User information',
    type: LoginUserDto
  })
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isPasswordChanged: boolean;
  };

  @ApiProperty({
    description: 'Login status message',
    example: 'Login successful'
  })
  message: string;
}