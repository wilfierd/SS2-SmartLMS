import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import { AdminCreateUserDto } from '../users/dto/admin-create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailForAuth(email);
    
    if (user && await user.comparePassword(password)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(user: any): Promise<LoginResponseDto> {
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role 
    };
    
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isPasswordChanged: user.isPasswordChanged,
      },
      message: 'Login successful',
    };
  }
  async validateOAuthUser(oauthUser: any): Promise<User> {
    // Try to find user by email
    let user = await this.usersService.findByEmailForAuth(oauthUser.email);
    
    if (user) {
      // Update Google ID if not already set
      if (!user.googleId) {
        await this.usersService.updateUserGoogleId(user.id, oauthUser.googleId);
        user.googleId = oauthUser.googleId;
      }
      return user;
    }
    
    // Create new user with Google OAuth data
    const createUserDto: AdminCreateUserDto = {
      email: oauthUser.email,
      firstName: oauthUser.firstName,
      lastName: oauthUser.lastName,
      // Use the same default password as in server.js
      password: '123456789',
      role: UserRole.STUDENT, // Default role for OAuth users
      googleId: oauthUser.googleId,
    };
    
    const newUser = await this.usersService.adminCreateUser(createUserDto);
    const savedUser = await this.usersService.findByEmailForAuth(newUser.email);
    if (!savedUser) {
      throw new InternalServerErrorException('Failed to create or retrieve OAuth user');
    }
    return savedUser;  }
}