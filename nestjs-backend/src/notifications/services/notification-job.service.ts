import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateNotificationDto } from '../dto/notification.dto';
import { NotificationJobData } from '../processors/notification.processor';

@Injectable()
export class NotificationJobService {
    constructor(
        @InjectQueue('notifications')
        private notificationQueue: Queue,
    ) { }

    async scheduleNotification(notification: CreateNotificationDto, delay?: number) {
        const jobData: NotificationJobData = {
            type: 'single',
            notification,
        };

        if (delay) {
            return await this.notificationQueue.add('send-notification', jobData, { delay });
        } else {
            return await this.notificationQueue.add('send-notification', jobData);
        }
    }

    async scheduleBulkNotifications(notifications: CreateNotificationDto[], delay?: number) {
        const jobData: NotificationJobData = {
            type: 'bulk',
            notifications,
        };

        if (delay) {
            return await this.notificationQueue.add('send-notification', jobData, { delay });
        } else {
            return await this.notificationQueue.add('send-notification', jobData);
        }
    }

    async scheduleAssignmentDueReminder(
        userId: number,
        assignmentTitle: string,
        dueDate: Date,
        courseId: number,
        reminderMinutes: number = 60, // Default: 1 hour before due
    ) {
        const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);
        const delay = reminderTime.getTime() - Date.now(); if (delay > 0) {
            const jobData: NotificationJobData = {
                type: 'single',
                userId,
                assignmentTitle,
                dueDate,
                courseId,
            };

            return await this.notificationQueue.add('assignment-due-reminder', jobData, { delay });
        }
    }

    async scheduleTestDueReminder(
        userId: number,
        testTitle: string,
        dueDate: Date,
        courseId: number,
        reminderMinutes: number = 60, // Default: 1 hour before due
    ) {
        const reminderTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);
        const delay = reminderTime.getTime() - Date.now(); if (delay > 0) {
            const jobData: NotificationJobData = {
                type: 'single',
                userId,
                testTitle,
                dueDate,
                courseId,
            };

            return await this.notificationQueue.add('test-due-reminder', jobData, { delay });
        }
    }

    async scheduleMessageNotification(
        userId: number,
        senderName: string,
        messagePreview: string,
        delay?: number,
    ) {
        const jobData: NotificationJobData = {
            type: 'single',
            userId,
            senderName,
            messagePreview,
        };

        if (delay) {
            return await this.notificationQueue.add('message-notification', jobData, { delay });
        } else {
            return await this.notificationQueue.add('message-notification', jobData);
        }
    }

    async scheduleCourseUpdateNotification(
        userId: number,
        courseName: string,
        updateType: string,
        courseId: number,
        delay?: number,
    ) {
        const jobData: NotificationJobData = {
            type: 'single',
            userId,
            courseName,
            updateType,
            courseId,
        };

        if (delay) {
            return await this.notificationQueue.add('course-update-notification', jobData, { delay });
        } else {
            return await this.notificationQueue.add('course-update-notification', jobData);
        }
    }

    // Scheduled job to check for upcoming due dates every hour
    @Cron(CronExpression.EVERY_HOUR)
    async checkUpcomingDueDates() {
        console.log('Checking for upcoming due dates...');
        // This would typically query the database for assignments/tests due within the next 24 hours
        // and schedule reminder notifications if not already scheduled

        // Implementation would depend on your specific assignment/test entities
        // For now, this is a placeholder for the cron job structure
    }

    // Scheduled job to clean up old processed jobs
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldJobs() {
        console.log('Cleaning up old notification jobs...');

        // Remove completed jobs older than 7 days
        await this.notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'completed');

        // Remove failed jobs older than 30 days
        await this.notificationQueue.clean(30 * 24 * 60 * 60 * 1000, 'failed');
    }

    // Get queue statistics
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.notificationQueue.getWaiting(),
            this.notificationQueue.getActive(),
            this.notificationQueue.getCompleted(),
            this.notificationQueue.getFailed(),
            this.notificationQueue.getDelayed(),
        ]);

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
        };
    }

    // Cancel a scheduled job
    async cancelJob(jobId: string) {
        const job = await this.notificationQueue.getJob(jobId);
        if (job) {
            await job.remove();
            return true;
        }
        return false;
    }

    // Retry a failed job
    async retryJob(jobId: string) {
        const job = await this.notificationQueue.getJob(jobId);
        if (job) {
            await job.retry();
            return true;
        }
        return false;
    }
}
