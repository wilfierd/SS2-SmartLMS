import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Course } from '../../../courses/entities/course.entity';
import { Lesson } from '../../../courses/entities/lesson.entity';
import { AssignmentSubmission } from './assignment-submission.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'max_points', default: 100 })
  maxPoints: number;

  @Column({ name: 'due_date', type: 'datetime', nullable: true })
  dueDate: Date;

  @Column({ name: 'allowed_file_types', default: 'pdf,docx,zip' })
  allowedFileTypes: string;

  @Column({ name: 'max_file_size', default: 5 })
  maxFileSize: number;

  @Column({ name: 'allow_late_submissions', default: false })
  allowLateSubmissions: boolean;

  @Column({ name: 'course_id' })
  courseId: number;

  @Column({ name: 'lesson_id' })
  lessonId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @OneToMany(() => AssignmentSubmission, submission => submission.assignment)
  submissions: AssignmentSubmission[];
} 