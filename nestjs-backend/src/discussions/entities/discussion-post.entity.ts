// src/discussions/entities/discussion-post.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Discussion } from './discussion.entity';
import { User } from '../../users/entities/user.entity';

@Entity('discussion_posts')
export class DiscussionPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'discussion_id' })
  discussionId: number;

  @ManyToOne(() => Discussion, discussion => discussion.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'discussion_id' })
  discussion: Discussion;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'parent_post_id', nullable: true })
  parentPostId: number;

  @ManyToOne(() => DiscussionPost, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_post_id' })
  parentPost: DiscussionPost;

  @OneToMany(() => DiscussionPost, post => post.parentPost)
  replies: DiscussionPost[];

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}