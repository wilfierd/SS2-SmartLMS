import { Controller, Post, UseGuards, Request, Body, Get, HttpStatus, UnauthorizedException, Logger, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../common/guards/local-auth.guard';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { Response } from 'express';

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
  async googleAuth() {
    // This endpoint initiates Google OAuth flow
    // The guard handles the redirect to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Request() req) {
    // After successful Google authentication, generate JWT
    const loginResponse = await this.authService.login(req.user);
    
    // Redirect to frontend with token
    const frontendUrl = this.configService.get<string>('frontend.url');
    const redirectUrl = `${frontendUrl}/auth/google/success?token=${loginResponse.token}`;
    
    return redirectUrl;
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
} 