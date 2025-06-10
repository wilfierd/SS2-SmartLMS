import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationJobService } from './services/notification-job.service';
import { Notification } from './entities/notification.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification]),
        ScheduleModule.forRoot(), BullModule.registerQueue({
            name: 'notifications',
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
            },
        }), JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'default-secret',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
                },
            }),
        }),
    ],
    controllers: [NotificationsController],
    providers: [
        NotificationsService,
        NotificationsGateway,
        NotificationProcessor,
        NotificationJobService,
    ],
    exports: [
        NotificationsService,
        NotificationsGateway,
        NotificationJobService,
    ],
})
export class NotificationsModule { }
