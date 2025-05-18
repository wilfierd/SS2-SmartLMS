import { Request } from 'express';
import { UserRole } from '../../users/entities/user.entity';

export interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
    role: UserRole;
  };
} 