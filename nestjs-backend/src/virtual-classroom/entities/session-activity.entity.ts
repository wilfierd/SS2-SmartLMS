import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { VirtualSession } from './virtual-session.entity';
import { User } from '../../users/entities/user.entity';

export enum ActivityAction {
  JOIN = 'join',
  LEAVE = 'leave',
  SCREEN_SHARE = 'screenShare',
  CHAT = 'chat',
  HAND_RAISE = 'hand_raise',
  MICROPHONE = 'microphone',
  CAMERA = 'camera'
}

@Entity('session_activities')
export class SessionActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @ManyToOne(() => VirtualSession, session => session.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: VirtualSession;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  action: string;

  @Column({ name: 'action_value', nullable: true })
  actionValue: string;

  @Column({ name: 'duration_seconds', nullable: true })
  durationSeconds: number;

  @Column({ name: 'device_info', nullable: true, type: 'text' })
  deviceInfo: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
} 