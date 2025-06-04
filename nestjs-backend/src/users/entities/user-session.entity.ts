import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'session_token', unique: true })
    sessionToken: string;

    @Column({ name: 'login_time' })
    loginTime: Date;

    @Column({ name: 'logout_time', nullable: true })
    logoutTime: Date;

    @Column({ name: 'ip_address', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', nullable: true })
    userAgent: string;

    @Column({ name: 'browser_info', nullable: true })
    browserInfo: string;

    @Column({ name: 'device_type', nullable: true })
    deviceType: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}
