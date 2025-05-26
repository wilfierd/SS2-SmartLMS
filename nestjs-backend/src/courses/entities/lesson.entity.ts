import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { CourseModule } from './course-module.entity';
import { LessonMaterial } from './lesson-material.entity';

export enum ContentType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  LIVE_SESSION = 'live_session'
}

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    name: 'content_type'
  })
  contentType: ContentType;

  @Column({ nullable: true, type: 'text' })
  content: string;

  @Column({ nullable: true, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'int', name: 'order_index' })
  orderIndex: number;

  @Column({ default: false, name: 'is_published' })
  isPublished: boolean;

  @Column({ name: 'module_id' })
  moduleId: number;

  @ManyToOne(() => CourseModule, module => module.lessons, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' }) 
  module: CourseModule;

  @OneToMany(() => LessonMaterial, material => material.lesson)
  materials: LessonMaterial[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}