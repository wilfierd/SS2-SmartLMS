// src/messages/entities/message.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, user => user.sentMessages)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @ManyToOne(() => User, user => user.receivedMessages)
    @JoinColumn({ name: 'receiver_id' })
    receiver: User;

    @Column('text')
    content: string;

    @CreateDateColumn({ name: 'createdAt' })
    createdAt: Date;

}
