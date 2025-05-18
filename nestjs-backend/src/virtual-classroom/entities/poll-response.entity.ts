import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { SessionPoll } from './session-poll.entity';
import { PollOption } from './poll-option.entity';
import { User } from '../../users/entities/user.entity';

@Entity('poll_responses')
@Unique(['pollId', 'userId', 'optionId'])
export class PollResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'poll_id' })
  pollId: number;

  @ManyToOne(() => SessionPoll, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poll_id' })
  poll: SessionPoll;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'option_id' })
  optionId: number;

  @ManyToOne(() => PollOption, option => option.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'option_id' })
  option: PollOption;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
} 