import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Req,
    ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto, NotificationFilterDto } from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsGateway } from './gateways/notifications.gateway';

interface AuthenticatedRequest extends Request {
    user: {
        sub: number;
        email: string;
        role: string;
    };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    @Post()
    async create(@Body() createNotificationDto: CreateNotificationDto, @Req() req: AuthenticatedRequest) {
        const notification = await this.notificationsService.create(createNotificationDto);

        // Broadcast new notification via WebSocket
        await this.notificationsGateway.broadcastNewNotification(notification);

        return notification;
    }

    @Get()
    async findAll(@Query() filters: NotificationFilterDto, @Req() req: AuthenticatedRequest) {
        return await this.notificationsService.findByUserId(req.user.sub, filters);
    }

    @Get('unread-count')
    async getUnreadCount(@Req() req: AuthenticatedRequest) {
        const count = await this.notificationsService.getUnreadCount(req.user.sub);
        return { unreadCount: count };
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
        return await this.notificationsService.findOne(id, req.user.sub);
    }

    @Patch(':id')
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateNotificationDto: UpdateNotificationDto,
        @Req() req: AuthenticatedRequest,
    ) {
        const notification = await this.notificationsService.update(id, req.user.sub, updateNotificationDto);

        // Broadcast notification update via WebSocket
        await this.notificationsGateway.sendToUser(req.user.sub, 'notificationUpdated', notification);

        return notification;
    }

    @Patch(':id/read')
    async markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
        const notification = await this.notificationsService.markAsRead(id, req.user.sub);
        const unreadCount = await this.notificationsService.getUnreadCount(req.user.sub);

        // Broadcast updates via WebSocket
        await this.notificationsGateway.sendToUser(req.user.sub, 'notificationUpdated', notification);
        await this.notificationsGateway.sendToUser(req.user.sub, 'unreadCount', unreadCount);

        return notification;
    }

    @Patch('mark-all-read')
    async markAllAsRead(@Req() req: AuthenticatedRequest) {
        await this.notificationsService.markAllAsRead(req.user.sub);
        const unreadCount = await this.notificationsService.getUnreadCount(req.user.sub);

        // Broadcast updates via WebSocket
        await this.notificationsGateway.sendToUser(req.user.sub, 'allNotificationsRead', true);
        await this.notificationsGateway.sendToUser(req.user.sub, 'unreadCount', unreadCount);

        return { success: true, unreadCount };
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
        await this.notificationsService.remove(id, req.user.sub);
        const unreadCount = await this.notificationsService.getUnreadCount(req.user.sub);

        // Broadcast updates via WebSocket
        await this.notificationsGateway.sendToUser(req.user.sub, 'notificationDeleted', id);
        await this.notificationsGateway.sendToUser(req.user.sub, 'unreadCount', unreadCount);

        return { success: true };
    }

    @Delete()
    async removeAll(@Req() req: AuthenticatedRequest) {
        await this.notificationsService.removeAll(req.user.sub);

        // Broadcast updates via WebSocket
        await this.notificationsGateway.sendToUser(req.user.sub, 'allNotificationsDeleted', true);
        await this.notificationsGateway.sendToUser(req.user.sub, 'unreadCount', 0);

        return { success: true };
    }

    // Admin/Instructor routes for creating notifications for others
    @Post('bulk')
    async createBulk(@Body() notifications: CreateNotificationDto[], @Req() req: AuthenticatedRequest) {
        // Only allow admins and instructors to create bulk notifications
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            throw new Error('Unauthorized to create bulk notifications');
        }

        const createdNotifications = await this.notificationsService.createBulkNotifications(notifications);

        // Broadcast new notifications via WebSocket
        for (const notification of createdNotifications) {
            await this.notificationsGateway.broadcastNewNotification(notification);
        }

        return createdNotifications;
    }

    // Helper endpoints for creating specific notification types
    @Post('assignment-due')
    async createAssignmentDueNotification(
        @Body() data: { userId: number; assignmentTitle: string; dueDate: string; courseId: number },
        @Req() req: AuthenticatedRequest,
    ) {
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            throw new Error('Unauthorized to create assignment notifications');
        }

        const notification = await this.notificationsService.createAssignmentDueNotification(
            data.userId,
            data.assignmentTitle,
            new Date(data.dueDate),
            data.courseId,
        );

        await this.notificationsGateway.broadcastNewNotification(notification);
        return notification;
    }

    @Post('test-due')
    async createTestDueNotification(
        @Body() data: { userId: number; testTitle: string; dueDate: string; courseId: number },
        @Req() req: AuthenticatedRequest,
    ) {
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            throw new Error('Unauthorized to create test notifications');
        }

        const notification = await this.notificationsService.createTestDueNotification(
            data.userId,
            data.testTitle,
            new Date(data.dueDate),
            data.courseId,
        );

        await this.notificationsGateway.broadcastNewNotification(notification);
        return notification;
    }

    @Post('message')
    async createMessageNotification(
        @Body() data: { userId: number; senderName: string; messagePreview: string },
        @Req() req: AuthenticatedRequest,
    ) {
        const notification = await this.notificationsService.createMessageNotification(
            data.userId,
            data.senderName,
            data.messagePreview,
        );

        await this.notificationsGateway.broadcastNewNotification(notification);
        return notification;
    }

    @Post('course-update')
    async createCourseUpdateNotification(
        @Body() data: { userId: number; courseName: string; updateType: string; courseId: number },
        @Req() req: AuthenticatedRequest,
    ) {
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
            throw new Error('Unauthorized to create course update notifications');
        }

        const notification = await this.notificationsService.createCourseUpdateNotification(
            data.userId,
            data.courseName,
            data.updateType,
            data.courseId,
        );

        await this.notificationsGateway.broadcastNewNotification(notification);
        return notification;
    }
}
