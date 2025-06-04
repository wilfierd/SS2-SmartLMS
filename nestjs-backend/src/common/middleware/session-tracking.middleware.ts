import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSession } from '../../users/entities/user-session.entity';
import { UserActivity, ActivityType } from '../../users/entities/user-activity.entity';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class SessionTrackingMiddleware implements NestMiddleware {
    constructor(
        @InjectRepository(UserSession)
        private sessionsRepository: Repository<UserSession>,
        @InjectRepository(UserActivity)
        private activitiesRepository: Repository<UserActivity>,
    ) { } async use(req: RequestWithUser, res: Response, next: NextFunction) {
        // Only track for authenticated users
        if (req.user && req.user.userId) {
            const userId = req.user.userId;
            const sessionToken = req.sessionID || req.headers['x-session-id'] as string || `session_${Date.now()}`;

            // Get client information
            const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.connection.remoteAddress || '';
            const userAgent = req.headers['user-agent'] || '';

            // Parse browser info
            const browserInfo = this.parseBrowserInfo(userAgent);
            const deviceType = this.getDeviceType(userAgent);

            // Check if session already exists
            let session = await this.sessionsRepository.findOne({
                where: { sessionToken, userId }
            });

            if (!session) {
                // Create new session
                session = this.sessionsRepository.create({
                    userId,
                    sessionToken,
                    loginTime: new Date(),
                    ipAddress,
                    userAgent,
                    browserInfo,
                    deviceType,
                    isActive: true,
                });

                await this.sessionsRepository.save(session);

                // Log login activity
                await this.logActivity(
                    userId,
                    ActivityType.LOGIN,
                    'User logged in',
                    { sessionToken, browserInfo, deviceType },
                    ipAddress,
                    userAgent
                );
            } else {
                // Update session to mark as active
                session.isActive = true;
                await this.sessionsRepository.save(session);
            }

            // Store session info in request for later use
            req.userSession = session;
        }

        next();
    }

    private parseBrowserInfo(userAgent: string): string {
        if (!userAgent) return 'Unknown';

        // Extract browser information
        if (userAgent.includes('Chrome')) {
            const version = userAgent.match(/Chrome\/(\d+\.\d+)/);
            return `Chrome ${version ? version[1] : ''}`.trim();
        } else if (userAgent.includes('Firefox')) {
            const version = userAgent.match(/Firefox\/(\d+\.\d+)/);
            return `Firefox ${version ? version[1] : ''}`.trim();
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            const version = userAgent.match(/Safari\/(\d+\.\d+)/);
            return `Safari ${version ? version[1] : ''}`.trim();
        } else if (userAgent.includes('Edge')) {
            const version = userAgent.match(/Edge\/(\d+\.\d+)/);
            return `Edge ${version ? version[1] : ''}`.trim();
        }

        return 'Unknown Browser';
    }

    private getDeviceType(userAgent: string): string {
        if (!userAgent) return 'Unknown';

        if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            return 'Mobile';
        } else if (/Tablet|iPad/i.test(userAgent)) {
            return 'Tablet';
        }

        return 'Desktop';
    } private async logActivity(
        userId: number,
        type: ActivityType,
        description: string,
        metadata?: any,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        const activity = this.activitiesRepository.create({
            userId,
            type,
            description,
            metadata,
            ipAddress,
            userAgent,
        });

        await this.activitiesRepository.save(activity);
    }
}

// Extend Express Request type to include userSession
declare global {
    namespace Express {
        interface Request {
            userSession?: UserSession;
        }
    }
}
