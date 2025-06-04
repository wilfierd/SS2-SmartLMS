import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

export enum ActivityType {
    LOGIN = 'login',
    LOGOUT = 'logout',
    COURSE_ACCESS = 'course_access',
    MODULE_COMPLETE = 'module_complete',
    ASSIGNMENT_SUBMIT = 'assignment_submit',
    QUIZ_COMPLETE = 'quiz_complete',
    SESSION_JOIN = 'session_join',
    SESSION_LEAVE = 'session_leave',
    PROFILE_UPDATE = 'profile_update',
    PASSWORD_CHANGE = 'password_change',
}

@Entity('user_activities')
export class UserActivity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({
        type: 'enum',
        enum: ActivityType,
    })
    type: ActivityType;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'metadata', type: 'json', nullable: true })
    metadata: any;

    @Column({ name: 'ip_address', nullable: true })
    ipAddress: string;

    @Column({ name: 'user_agent', nullable: true })
    userAgent: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}
