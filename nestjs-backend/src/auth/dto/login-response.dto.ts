import { UserRole } from '../../users/entities/user.entity';

export class LoginResponseDto {
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isPasswordChanged: boolean;
  };
  message: string;
} 