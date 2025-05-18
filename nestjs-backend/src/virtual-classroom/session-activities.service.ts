import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SessionActivity } from './entities/session-activity.entity';
import { VirtualSession } from './entities/virtual-session.entity';
import { SessionRegistration } from './entities/session-registration.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { RegistrationStatus } from './entities/session-registration.entity';
import { MoreThan } from 'typeorm';

@Injectable()
export class SessionActivitiesService {
  private readonly logger = new Logger(SessionActivitiesService.name);

  constructor(
    @InjectRepository(SessionActivity)
    private readonly activityRepository: Repository<SessionActivity>,
    @InjectRepository(VirtualSession)
    private readonly sessionRepository: Repository<VirtualSession>,
    @InjectRepository(SessionRegistration)
    private readonly registrationRepository: Repository<SessionRegistration>,
  ) {}

  async recordActivity(
    createActivityDto: CreateActivityDto,
    userId: number,
  ): Promise<SessionActivity> {
    let durationSeconds = 0;
    
    if (createActivityDto.action === 'leave') {
      // Find the latest 'join' activity for the same session and user
      const joinActivity = await this.activityRepository.findOne({
        where: {
          sessionId: createActivityDto.sessionId,
          userId: userId,
          action: 'join',
        },
        order: {
          timestamp: 'DESC',
        },
      });

      if (joinActivity) {
        const joinTime = joinActivity.timestamp;
        const leaveTime = new Date();
        
        // Calculate duration in seconds
        durationSeconds = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);
      }
    }

    // Create activity record
    const activity = new SessionActivity();
    activity.sessionId = createActivityDto.sessionId;
    activity.userId = userId;
    activity.action = createActivityDto.action;
    activity.actionValue = createActivityDto.actionValue || '';
    activity.durationSeconds = durationSeconds;
    activity.deviceInfo = createActivityDto.deviceInfo || '';
    activity.ipAddress = createActivityDto.ipAddress || '';

    return await this.activityRepository.save(activity);
  }

  async createActivity(
    createActivityDto: CreateActivityDto,
    userId: number,
  ): Promise<SessionActivity> {
    return this.recordActivity(createActivityDto, userId);
  }

  async getSessionActivities(sessionId: number): Promise<SessionActivity[]> {
    return this.activityRepository.find({
      where: { sessionId: sessionId },
      order: { timestamp: 'DESC' },
    });
  }

  async getUserActivities(userId: number): Promise<SessionActivity[]> {
    return this.activityRepository.find({
      where: { userId },
      relations: ['session'],
      order: { timestamp: 'DESC' },
    });
  }

  async getActivityMetrics(sessionId: number): Promise<any> {
    // Get basic metrics
    const result = await this.activityRepository
      .createQueryBuilder('activity')
      .select('COUNT(DISTINCT activity.userId)', 'uniqueParticipants')
      .addSelect('COUNT(CASE WHEN activity.action = :joinAction THEN 1 END)', 'totalJoins')
      .addSelect('COUNT(CASE WHEN activity.action = :leaveAction THEN 1 END)', 'totalLeaves')
      .addSelect('AVG(CASE WHEN activity.action = :leaveAction THEN activity.durationSeconds END)', 'avgDurationSeconds')
      .addSelect('MAX(CASE WHEN activity.action = :leaveAction THEN activity.durationSeconds END)', 'maxDurationSeconds')
      .where('activity.sessionId = :sessionId', { sessionId })
      .setParameter('joinAction', 'join')
      .setParameter('leaveAction', 'leave')
      .getRawOne();

    // Get presence timeline
    const presenceTimeline = await this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.userId', 'userId')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('activity.action', 'action')
      .addSelect('activity.timestamp', 'timestamp')
      .innerJoin('activity.user', 'user')
      .where('activity.sessionId = :sessionId', { sessionId })
      .andWhere('activity.action IN (:...actions)', { actions: ['join', 'leave'] })
      .orderBy('activity.userId', 'ASC')
      .addOrderBy('activity.timestamp', 'ASC')
      .getRawMany();

    return {
      ...result,
      presenceTimeline,
    };
  }

  private async ensureRegistration(sessionId: number, userId: number): Promise<void> {
    // Check if user is already registered
    const existing = await this.registrationRepository.findOne({
      where: { sessionId, userId }
    });

    if (!existing) {
      // Create registration
      const registration = this.registrationRepository.create({
        sessionId,
        userId,
        status: RegistrationStatus.ATTENDED,
      });
      await this.registrationRepository.save(registration);
    } else if (existing.status !== RegistrationStatus.ATTENDED) {
      // Update status to attended
      existing.status = RegistrationStatus.ATTENDED;
      await this.registrationRepository.save(existing);
    }
  }

  /**
   * Get all active participants in a session (those who have joined but not left)
   */
  async getActiveParticipants(sessionId: number): Promise<number[]> {
    // Find all users who have joined but not left
    const joinActivities = await this.activityRepository.find({
      where: {
        sessionId: sessionId,
        action: 'join',
      },
      order: {
        timestamp: 'DESC',
      },
    });

    // Extract unique user IDs
    const userIds = [...new Set(joinActivities.map(activity => activity.userId))];

    // Filter out users who have left
    const activeUserIds = await Promise.all(
      userIds.map(async (userId) => {
        const lastActivity = await this.activityRepository.findOne({
          where: {
            sessionId: sessionId,
            userId: userId,
          },
          order: {
            timestamp: 'DESC',
          },
        });

        return lastActivity && lastActivity.action !== 'leave' ? userId : null;
      })
    );

    return activeUserIds.filter((id): id is number => id !== null);
  }
} 