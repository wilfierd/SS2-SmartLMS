import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualSession } from './entities/virtual-session.entity';
import { SessionRegistration } from './entities/session-registration.entity';
import { SessionActivity } from './entities/session-activity.entity';
import { SessionPoll } from './entities/session-poll.entity';
import { PollOption } from './entities/poll-option.entity';
import { PollResponse } from './entities/poll-response.entity';
import { BreakoutRoom } from './entities/breakout-room.entity';
import { BreakoutRoomParticipant } from './entities/breakout-room-participant.entity';
import { SessionRecording } from './entities/session-recording.entity';
import { VirtualSessionsService } from './virtual-sessions.service';
import { SessionActivitiesService } from './session-activities.service';
import { SessionPollsService } from './session-polls.service';
import { BreakoutRoomsService } from './breakout-rooms.service';
import { VirtualClassroomController } from './virtual-classroom.controller';
import { CoursesModule } from '../courses/courses.module';
import { UsersModule } from '../users/users.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VirtualSession,
      SessionRegistration,
      SessionActivity,
      SessionPoll,
      PollOption,
      PollResponse,
      BreakoutRoom,
      BreakoutRoomParticipant,
      SessionRecording
    ]),
    CoursesModule,
    UsersModule,
    ScheduleModule.forRoot()
  ],
  controllers: [VirtualClassroomController],
  providers: [
    VirtualSessionsService,
    SessionActivitiesService,
    SessionPollsService,
    BreakoutRoomsService
  ],
  exports: [
    VirtualSessionsService,
    SessionActivitiesService,
    SessionPollsService,
    BreakoutRoomsService
  ]
})
export class VirtualClassroomModule {} 