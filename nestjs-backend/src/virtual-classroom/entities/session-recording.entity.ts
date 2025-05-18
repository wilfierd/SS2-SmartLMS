import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { VirtualSession } from './virtual-session.entity';

export enum RecordingStatus {
  PROCESSING = 'processing',
  READY = 'ready',
  FAILED = 'failed'
}

@Entity('session_recordings')
export class SessionRecording {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  session_id: number;

  @ManyToOne(() => VirtualSession, session => session.recordings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: VirtualSession;

  @Column()
  storage_path: string;

  @CreateDateColumn()
  start_time: Date;

  @Column({ nullable: true })
  end_time: Date;

  @Column({
    type: 'enum',
    enum: RecordingStatus,
    default: RecordingStatus.PROCESSING
  })
  status: RecordingStatus;

  @Column({ nullable: true })
  error_message: string;
} 