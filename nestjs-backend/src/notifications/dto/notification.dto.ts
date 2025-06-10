import { IsEnum, IsOptional, IsString, IsBoolean, IsDateString, IsObject, IsInt } from 'class-validator';
import { NotificationType, NotificationPriority } from '../entities/notification.entity';

export class CreateNotificationDto {
    @IsString()
    title: string;

    @IsString()
    message: string;

    @IsEnum(NotificationType)
    type: NotificationType;

    @IsEnum(NotificationPriority)
    @IsOptional()
    priority?: NotificationPriority;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsObject()
    @IsOptional()
    metadata?: any;

    @IsString()
    @IsOptional()
    actionUrl?: string;

    @IsInt()
    userId: number;
}

export class UpdateNotificationDto {
    @IsBoolean()
    @IsOptional()
    isRead?: boolean;

    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    message?: string;

    @IsEnum(NotificationPriority)
    @IsOptional()
    priority?: NotificationPriority;

    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @IsObject()
    @IsOptional()
    metadata?: any;

    @IsString()
    @IsOptional()
    actionUrl?: string;
}

export class NotificationFilterDto {
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;

    @IsOptional()
    @IsBoolean()
    isRead?: boolean;

    @IsOptional()
    @IsEnum(NotificationPriority)
    priority?: NotificationPriority;

    @IsOptional()
    @IsString()
    dateFrom?: string;

    @IsOptional()
    @IsString()
    dateTo?: string;

    @IsOptional()
    @IsInt()
    page?: number = 1;

    @IsOptional()
    @IsInt()
    limit?: number = 20;
}
