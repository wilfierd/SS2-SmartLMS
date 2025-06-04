import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AuthController } from './auth.controller';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserActivity } from '../users/entities/user-activity.entity';
import { UserSession } from '../users/entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken, UserActivity, UserSession]),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get('jwt');
        return {
          secret: config?.secret || process.env.JWT_SECRET || 'your_default_jwt_secret_for_development',
          signOptions: {
            expiresIn: config?.expiresIn || '1h',
          },
        };
      },
    }),
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
