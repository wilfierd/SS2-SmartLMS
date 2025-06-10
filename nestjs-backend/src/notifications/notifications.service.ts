import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto, NotificationFilterDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
    constructor(
        @InjectRepository(Notification)
        private notificationRepository: Repository<Notification>,
    ) { } async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
        const notification = this.notificationRepository.create({
            ...createNotificationDto,
            dueDate: createNotificationDto.dueDate ? new Date(createNotificationDto.dueDate) : undefined,
        });

        return await this.notificationRepository.save(notification);
    }

    async findByUserId(
        userId: number,
        filters: NotificationFilterDto = {},
    ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
        const { type, isRead, priority, dateFrom, dateTo, page = 1, limit = 20 } = filters;

        const queryBuilder = this.notificationRepository
            .createQueryBuilder('notification')
            .where('notification.userId = :userId', { userId })
            .andWhere('notification.deletedAt IS NULL');

        // Apply filters
        if (type) {
            queryBuilder.andWhere('notification.type = :type', { type });
        }

        if (isRead !== undefined) {
            queryBuilder.andWhere('notification.isRead = :isRead', { isRead });
        }

        if (priority) {
            queryBuilder.andWhere('notification.priority = :priority', { priority });
        }

        if (dateFrom || dateTo) {
            const startDate = dateFrom ? new Date(dateFrom) : new Date('1970-01-01');
            const endDate = dateTo ? new Date(dateTo) : new Date();
            queryBuilder.andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            });
        }

        // Get total count for pagination
        const total = await queryBuilder.getCount();

        // Apply pagination and sorting
        const notifications = await queryBuilder
            .orderBy('notification.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        // Get unread count
        const unreadCount = await this.notificationRepository.count({
            where: {
                userId,
                isRead: false,
                deletedAt: IsNull(),
            },
        });

        return { notifications, total, unreadCount };
    }

    async findOne(id: number, userId: number): Promise<Notification> {
        const notification = await this.notificationRepository.findOne({
            where: { id, userId, deletedAt: IsNull() },
        });

        if (!notification) {
            throw new NotFoundException('Notification not found');
        }

        return notification;
    }

    async update(id: number, userId: number, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
        const notification = await this.findOne(id, userId);

        Object.assign(notification, {
            ...updateNotificationDto,
            dueDate: updateNotificationDto.dueDate ? new Date(updateNotificationDto.dueDate) : notification.dueDate,
        });

        return await this.notificationRepository.save(notification);
    }

    async markAsRead(id: number, userId: number): Promise<Notification> {
        return await this.update(id, userId, { isRead: true });
    }

    async markAllAsRead(userId: number): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false, deletedAt: IsNull() },
            { isRead: true },
        );
    }

    async remove(id: number, userId: number): Promise<void> {
        const notification = await this.findOne(id, userId);
        notification.deletedAt = new Date();
        await this.notificationRepository.save(notification);
    }

    async removeAll(userId: number): Promise<void> {
        await this.notificationRepository.update(
            { userId, deletedAt: IsNull() },
            { deletedAt: new Date() },
        );
    }

    async getUnreadCount(userId: number): Promise<number> {
        return await this.notificationRepository.count({
            where: {
                userId,
                isRead: false,
                deletedAt: IsNull(),
            },
        });
    }

    async createBulkNotifications(notifications: CreateNotificationDto[]): Promise<Notification[]> {
        const notificationEntities = notifications.map(dto =>
            this.notificationRepository.create({
                ...dto,
                dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
            })
        );

        return await this.notificationRepository.save(notificationEntities);
    }

    // Helper methods for specific notification types
    async createAssignmentDueNotification(
        userId: number,
        assignmentTitle: string,
        dueDate: Date,
        courseId: number,
    ): Promise<Notification> {
        return await this.create({
            userId,
            title: 'Assignment Due Soon',
            message: `Your assignment "${assignmentTitle}" is due soon.`,
            type: NotificationType.ASSIGNMENT_DUE,
            priority: NotificationPriority.HIGH,
            dueDate: dueDate.toISOString(),
            metadata: { courseId, assignmentTitle },
            actionUrl: `/courses/${courseId}/assignments`,
        });
    }

    async createTestDueNotification(
        userId: number,
        testTitle: string,
        dueDate: Date,
        courseId: number,
    ): Promise<Notification> {
        return await this.create({
            userId,
            title: 'Test Due Soon',
            message: `Your test "${testTitle}" is due soon.`,
            type: NotificationType.TEST_DUE,
            priority: NotificationPriority.HIGH,
            dueDate: dueDate.toISOString(),
            metadata: { courseId, testTitle },
            actionUrl: `/courses/${courseId}/tests`,
        });
    }

    async createMessageNotification(
        userId: number,
        senderName: string,
        messagePreview: string,
    ): Promise<Notification> {
        return await this.create({
            userId,
            title: 'New Message',
            message: `You have a new message from ${senderName}: "${messagePreview.substring(0, 50)}..."`,
            type: NotificationType.MESSAGE_RECEIVED,
            priority: NotificationPriority.MEDIUM,
            actionUrl: '/messages',
        });
    }

    async createCourseUpdateNotification(
        userId: number,
        courseName: string,
        updateType: string,
        courseId: number,
    ): Promise<Notification> {
        return await this.create({
            userId,
            title: 'Course Update',
            message: `${courseName} has been updated: ${updateType}`,
            type: NotificationType.COURSE_UPDATE,
            priority: NotificationPriority.MEDIUM,
            metadata: { courseId, updateType },
            actionUrl: `/courses/${courseId}`,
        });
    }
}
