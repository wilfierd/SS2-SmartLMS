import { Controller, Post, UseGuards, Request, Body, Get, HttpStatus, UnauthorizedException, Logger, Res, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiExcludeEndpoint, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginResponseDto } from './dto/login-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyResetTokenResponseDto } from './dto/verify-reset-token.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private googleClient: OAuth2Client;

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    this.googleClient = new OAuth2Client(clientId, clientSecret);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'admin@lms.com',
          description: 'User email address'
        },
        password: {
          type: 'string',
          example: 'admin123',
          description: 'User password'
        }
      },
      required: ['email', 'password']
    }
  })
  @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'Bad Request - Missing email or password' })
  async login(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const loginResponse = await this.authService.login(req.user);
    this.logger.log(`User ${loginResponse.user.email} logged in (JWT issued)`);
    // set HTTP-only cookie for JWT
    res.cookie('Authentication', loginResponse.token, {
      httpOnly: true,
      path: '/',
      sameSite: this.configService.get<string>('nodeEnv') === 'production' ? 'none' : 'lax',
      secure: this.configService.get<string>('nodeEnv') === 'production',
    });
    return loginResponse;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleAuth() {
    // This endpoint initiates Google OAuth flow
    // The guard handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiExcludeEndpoint()
  async googleAuthCallback(@Request() req) {
    // After successful Google authentication, generate JWT
    const loginResponse = await this.authService.login(req.user);

    // Redirect to frontend with token
    const frontendUrl = this.configService.get<string>('frontend.url');
    const redirectUrl = `${frontendUrl}/auth/google/success?token=${loginResponse.token}`;

    return redirectUrl;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset link sent (if email exists)',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'If an account with that email exists, a password reset link has been sent.'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid email format' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Get('verify-reset-token/:token')
  @ApiOperation({ summary: 'Verify password reset token' })
  @ApiParam({
    name: 'token',
    description: 'Password reset token',
    example: 'abc123def456'
  })
  @ApiResponse({
    status: 200,
    description: 'Token verification result',
    type: VerifyResetTokenResponseDto
  })
  async verifyResetToken(@Param('token') token: string): Promise<VerifyResetTokenResponseDto> {
    return this.authService.verifyResetToken(token);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset successful. You can now log in with your new password.'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('google')
  async googleTokenAuth(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const clientId = this.configService.get<string>('google.clientId');
    const ticket = await this.googleClient.verifyIdToken({ idToken: token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token payload');
    }
    const oauthUser = {
      email: payload.email!,
      firstName: payload.given_name!,
      lastName: payload.family_name!,
      profileImage: payload.picture!,
      googleId: payload.sub!,
    };
    const user = await this.authService.validateOAuthUser(oauthUser);
    const loginResponse = await this.authService.login(user);
    this.logger.log(`OAuth user ${loginResponse.user.email} logged in (JWT issued)`);
    // set HTTP-only cookie for JWT
    res.cookie('Authentication', loginResponse.token, {
      httpOnly: true,
      path: '/',
      sameSite: this.configService.get<string>('nodeEnv') === 'production' ? 'none' : 'lax',
      secure: this.configService.get<string>('nodeEnv') === 'production',
    });
    return loginResponse;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Logout successful'
        }
      }
    }
  })
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // Log the logout activity using the session from middleware
      if (req.userSession) {
        await this.authService.logLogoutActivity(req.user.id, req.userSession);
      }

      // Clear the authentication cookie
      res.clearCookie('Authentication', {
        httpOnly: true,
        path: '/',
        sameSite: this.configService.get<string>('nodeEnv') === 'production' ? 'none' : 'lax',
        secure: this.configService.get<string>('nodeEnv') === 'production',
      });

      this.logger.log(`User ${req.user.email} logged out`);

      return {
        message: 'Logout successful'
      };
    } catch (error) {
      this.logger.error(`Error during logout for user ${req.user.email}:`, error);
      return {
        message: 'Logout successful' // Still return success to avoid exposing errors
      };
    }
  }
}