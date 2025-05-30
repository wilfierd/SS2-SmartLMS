import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailerService } from '../mailer/mailer.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { AdminCreateUserDto } from '../users/dto/admin-create-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetTokenResponseDto } from './dto/verify-reset-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private mailerService: MailerService,
  ) { }

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
    return savedUser;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    // Check if user exists
    const user = await this.usersService.findByEmailForAuth(email);

    // Don't reveal if email exists or not for security
    const response = {
      message: 'If an account with that email exists, a password reset link has been sent.'
    };

    if (!user) {
      return response;
    }

    // Create a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 1); // Token valid for 1 hour

    // Delete existing tokens for this user
    await this.passwordResetTokenRepository.delete({ userId: user.id });

    // Save new token to database
    const passwordResetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      token: resetToken,
      expiresAt: tokenExpires,
    });

    await this.passwordResetTokenRepository.save(passwordResetToken);

    // Send email
    try {
      await this.mailerService.sendPasswordReset(
        email,
        resetToken,
        `${user.firstName} ${user.lastName}`.trim() || user.email
      );
    } catch (error) {
      // Log error but don't reveal email sending issues to user
      console.error('Failed to send password reset email:', error);
    }

    return response;
  }

  async verifyResetToken(token: string): Promise<VerifyResetTokenResponseDto> {
    if (!token) {
      return { valid: false, message: 'Token is required' };
    }

    // Find token in database
    const passwordResetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
      return { valid: false, message: 'Invalid or expired token' };
    }

    if (!passwordResetToken.user) {
      return { valid: false, message: 'User not found' };
    }

    return {
      valid: true,
      message: 'Token is valid',
      user: {
        id: passwordResetToken.user.id,
        email: passwordResetToken.user.email,
      },
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Find token in database
    const passwordResetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!passwordResetToken || passwordResetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (!passwordResetToken.user) {
      throw new NotFoundException('User not found');
    }

    // Update password using the users service
    await this.usersService.updatePassword(passwordResetToken.userId, newPassword);

    // Delete token
    await this.passwordResetTokenRepository.delete({ userId: passwordResetToken.userId });

    return { message: 'Password reset successful. You can now log in with your new password.' };
  }
}