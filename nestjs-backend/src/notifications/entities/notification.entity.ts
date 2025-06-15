import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
    ASSIGNMENT_DUE = 'assignment_due',
    TEST_DUE = 'test_due',
    MESSAGE_RECEIVED = 'message_received',
    COURSE_UPDATE = 'course_update',
    GRADE_POSTED = 'grade_posted',
    ANNOUNCEMENT = 'announcement',
    DISCUSSION_REPLY = 'discussion_reply',
}

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type: NotificationType;

    @Column({
        type: 'enum',
        enum: NotificationPriority,
        default: NotificationPriority.MEDIUM,
    })
    priority: NotificationPriority;

    @Column({ type: 'boolean', default: false })
    isRead: boolean; @Column({ type: 'datetime', nullable: true })
    dueDate: Date | null;

    @Column({ type: 'json', nullable: true })
    metadata: any; @Column({ type: 'varchar', length: 500, nullable: true })
    actionUrl: string | null;

    @Column({ type: 'int' })
    userId: number;

    @ManyToOne(() => User, (user) => user.notifications)
    @JoinColumn({ name: 'userId' })
    user: User;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date; @Column({ type: 'datetime', nullable: true })
    deletedAt: Date | null;
}
