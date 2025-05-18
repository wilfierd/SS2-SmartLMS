import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BreakoutRoom } from './breakout-room.entity';
import { User } from '../../users/entities/user.entity';

@Entity('breakout_room_participants')
export class BreakoutRoomParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  breakout_room_id: number;

  @ManyToOne(() => BreakoutRoom, room => room.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'breakout_room_id' })
  breakoutRoom: BreakoutRoom;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  joined_at: Date;

  @Column({ nullable: true })
  left_at: Date;
} 