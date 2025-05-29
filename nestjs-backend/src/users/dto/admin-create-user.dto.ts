import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class AdminCreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@smartlms.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (min 8 chars, must include upper/lowercase letters and number/special char)',
    example: 'Password123!'
  })
  @IsString()
  @IsNotEmpty()
  @Length(8, 100)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak. Must include upper and lowercase letters, and at least one number or special character',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John'
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe'
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.STUDENT
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiProperty({
    description: 'User bio (optional)',
    example: 'Computer Science student with interest in web development',
    required: false
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  googleId?: string;
} 