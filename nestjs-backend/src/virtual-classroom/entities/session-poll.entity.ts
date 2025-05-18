import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { VirtualSession } from './virtual-session.entity';
import { User } from '../../users/entities/user.entity';
import { PollOption } from './poll-option.entity';

@Entity('session_polls')
export class SessionPoll {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @ManyToOne(() => VirtualSession, session => session.polls, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: VirtualSession;

  @Column({ name: 'creator_id' })
  creatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column()
  question: string;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @Column({ name: 'is_multiple_choice', default: false })
  isMultipleChoice: boolean;

  @Column({ name: 'ended_at', nullable: true })
  endedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => PollOption, option => option.poll)
  options: PollOption[];
} 