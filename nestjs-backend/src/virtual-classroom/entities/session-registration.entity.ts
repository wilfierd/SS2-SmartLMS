import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { VirtualSession } from './virtual-session.entity';
import { User } from '../../users/entities/user.entity';

export enum RegistrationStatus {
  REGISTERED = 'registered',
  ATTENDED = 'attended',
  CANCELLED = 'cancelled',
  ABSENT = 'absent'
}

@Entity('session_registrations')
@Unique(['sessionId', 'userId'])
export class SessionRegistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @ManyToOne(() => VirtualSession, session => session.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: VirtualSession;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, user => user.sessionRegistrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.REGISTERED
  })
  status: RegistrationStatus;

  @CreateDateColumn({ name: 'registration_date' })
  registrationDate: Date;
} 