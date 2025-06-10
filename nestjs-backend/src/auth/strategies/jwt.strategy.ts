import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    // Get the JWT secret
    const config = configService.get('jwt');
    const jwtSecret = config?.secret || process.env.JWT_SECRET || 'your_default_jwt_secret_for_development';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  } async validate(payload: any) {
    console.log('JWT payload:', payload);
    return {
      sub: payload.sub || payload.userId, // This is what the controllers expect
      userId: payload.sub || payload.userId,
      id: payload.sub || payload.userId, // Add id property to match Express implementation
      email: payload.email,
      role: payload.role,
    };
  }
} 