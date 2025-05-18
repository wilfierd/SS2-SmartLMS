import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { SessionRegistration } from './session-registration.entity';
import { SessionActivity } from './session-activity.entity';
import { SessionPoll } from './session-poll.entity';
import { BreakoutRoom } from './breakout-room.entity';
import { SessionRecording } from './session-recording.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('virtual_sessions')
export class VirtualSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ name: 'room_id', unique: true })
  roomId: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate: Date;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string;

  @Column({ name: 'actual_start_time', type: 'datetime', nullable: true })
  actualStartTime: Date;

  @Column({ name: 'actual_end_time', type: 'datetime', nullable: true })
  actualEndTime: Date;

  @Column({ nullable: true })
  password: string;

  @Column({ name: 'max_participants', default: 30 })
  maxParticipants: number;

  @Column({ name: 'is_recorded', default: true })
  isRecorded: boolean;

  @Column({ name: 'recording_url', nullable: true })
  recordingUrl: string;

  @Column({ name: 'instructor_id' })
  instructorId: number;

  @ManyToOne(() => User, user => user.instructedSessions)
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, course => course.virtualSessions)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => SessionRegistration, registration => registration.session)
  registrations: SessionRegistration[];

  @OneToMany(() => SessionActivity, activity => activity.session)
  activities: SessionActivity[];

  @OneToMany(() => SessionPoll, poll => poll.session)
  polls: SessionPoll[];

  @OneToMany(() => BreakoutRoom, breakoutRoom => breakoutRoom.session)
  breakoutRooms: BreakoutRoom[];

  @OneToMany(() => SessionRecording, recording => recording.session)
  recordings: SessionRecording[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 