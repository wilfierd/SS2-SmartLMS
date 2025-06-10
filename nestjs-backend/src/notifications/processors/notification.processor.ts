import { Processor, Process } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Job } from 'bull';
import { NotificationsService } from '../notifications.service';
import { NotificationsGateway } from '../gateways/notifications.gateway';
import { CreateNotificationDto } from '../dto/notification.dto';

export interface NotificationJobData {
    type: 'single' | 'bulk';
    notification?: CreateNotificationDto;
    notifications?: CreateNotificationDto[];
    userId?: number;
    assignmentTitle?: string;
    testTitle?: string;
    dueDate?: Date;
    courseId?: number;
    senderName?: string;
    messagePreview?: string;
    courseName?: string;
    updateType?: string;
}

@Injectable()
@Processor('notifications')
export class NotificationProcessor {
    constructor(
        private notificationsService: NotificationsService,
        private notificationsGateway: NotificationsGateway,
    ) { }

    @Process('send-notification')
    async handleSendNotification(job: Job<NotificationJobData>) {
        const { data } = job;

        try {
            if (data.type === 'single' && data.notification) {
                const notification = await this.notificationsService.create(data.notification);
                await this.notificationsGateway.broadcastNewNotification(notification);
                console.log(`Notification sent to user ${data.notification.userId}`);
            } else if (data.type === 'bulk' && data.notifications) {
                const notifications = await this.notificationsService.createBulkNotifications(data.notifications);

                for (const notification of notifications) {
                    await this.notificationsGateway.broadcastNewNotification(notification);
                }

                console.log(`Bulk notifications sent to ${notifications.length} users`);
            }
        } catch (error) {
            console.error('Error processing notification job:', error);
            throw error;
        }
    } @Process('assignment-due-reminder')
    async handleAssignmentDueReminder(job: Job<NotificationJobData>) {
        const { userId, assignmentTitle, dueDate, courseId } = job.data;

        if (!userId || !assignmentTitle || !dueDate || !courseId) {
            throw new Error('Missing required data for assignment due reminder');
        }

        try {
            const notification = await this.notificationsService.createAssignmentDueNotification(
                userId,
                assignmentTitle,
                dueDate,
                courseId,
            );

            await this.notificationsGateway.broadcastNewNotification(notification);
            console.log(`Assignment due reminder sent to user ${userId}`);
        } catch (error) {
            console.error('Error processing assignment due reminder:', error);
            throw error;
        }
    } @Process('test-due-reminder')
    async handleTestDueReminder(job: Job<NotificationJobData>) {
        const { userId, testTitle, dueDate, courseId } = job.data;

        if (!userId || !testTitle || !dueDate || !courseId) {
            throw new Error('Missing required data for test due reminder');
        }

        try {
            const notification = await this.notificationsService.createTestDueNotification(
                userId,
                testTitle,
                dueDate,
                courseId,
            );

            await this.notificationsGateway.broadcastNewNotification(notification);
            console.log(`Test due reminder sent to user ${userId}`);
        } catch (error) {
            console.error('Error processing test due reminder:', error);
            throw error;
        }
    } @Process('message-notification')
    async handleMessageNotification(job: Job<NotificationJobData>) {
        const { userId, senderName, messagePreview } = job.data;

        if (!userId || !senderName || !messagePreview) {
            throw new Error('Missing required data for message notification');
        }

        try {
            const notification = await this.notificationsService.createMessageNotification(
                userId,
                senderName,
                messagePreview,
            );

            await this.notificationsGateway.broadcastNewNotification(notification);
            console.log(`Message notification sent to user ${userId}`);
        } catch (error) {
            console.error('Error processing message notification:', error);
            throw error;
        }
    } @Process('course-update-notification')
    async handleCourseUpdateNotification(job: Job<NotificationJobData>) {
        const { userId, courseName, updateType, courseId } = job.data;

        if (!userId || !courseName || !updateType || !courseId) {
            throw new Error('Missing required data for course update notification');
        }

        try {
            const notification = await this.notificationsService.createCourseUpdateNotification(
                userId,
                courseName,
                updateType,
                courseId,
            );

            await this.notificationsGateway.broadcastNewNotification(notification);
            console.log(`Course update notification sent to user ${userId}`);
        } catch (error) {
            console.error('Error processing course update notification:', error);
            throw error;
        }
    }
}
