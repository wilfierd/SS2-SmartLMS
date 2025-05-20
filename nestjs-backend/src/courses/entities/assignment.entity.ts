import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { CourseModule } from './course-module.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: 100, name: 'max_points' })
  maxPoints: number;

  @Column({ type: 'datetime', name: 'due_date' })
  dueDate: Date;

  @Column({ default: 'pdf,docx', name: 'allowed_file_types' })
  allowedFileTypes: string;

  @Column({ default: 5, name: 'max_file_size' })
  maxFileSize: number;

  @Column({ default: false, name: 'allow_late_submissions' })
  allowLateSubmissions: boolean;

  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'lesson_id' })
  lessonId: number; // This actually references course_modules.id in the database

  @ManyToOne(() => CourseModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: CourseModule; // Actually references a module

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 