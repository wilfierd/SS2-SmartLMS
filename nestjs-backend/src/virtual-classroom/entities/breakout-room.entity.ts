import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn } from 'typeorm';
import { VirtualSession } from './virtual-session.entity';
import { BreakoutRoomParticipant } from './breakout-room-participant.entity';

@Entity('breakout_rooms')
export class BreakoutRoom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  session_id: number;

  @ManyToOne(() => VirtualSession, session => session.breakoutRooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: VirtualSession;

  @Column()
  name: string;

  @Column({ nullable: true })
  ended_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => BreakoutRoomParticipant, participant => participant.breakoutRoom)
  participants: BreakoutRoomParticipant[];
} 