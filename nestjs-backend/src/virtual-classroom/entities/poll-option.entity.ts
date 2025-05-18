import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { SessionPoll } from './session-poll.entity';
import { PollResponse } from './poll-response.entity';

@Entity('poll_options')
export class PollOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'poll_id' })
  pollId: number;

  @ManyToOne(() => SessionPoll, poll => poll.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poll_id' })
  poll: SessionPoll;

  @Column({ name: 'option_text' })
  optionText: string;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @OneToMany(() => PollResponse, response => response.option)
  responses: PollResponse[];
} 