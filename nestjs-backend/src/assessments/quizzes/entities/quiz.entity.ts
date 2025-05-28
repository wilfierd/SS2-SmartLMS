import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Course } from '../../../courses/entities/course.entity';
import { Lesson } from '../../../courses/entities/lesson.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuizAttempt } from './quiz-attempt.entity';

@Entity('quizzes')
export class Quiz {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;
  @Column({ nullable: true, type: 'text' })
  description: string | null;

  @Column({ name: 'course_id' })
  courseId: number;

  @Column({ name: 'lesson_id', nullable: true })
  lessonId: number | null;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'time_limit_minutes', default: 30 })
  timeLimitMinutes: number;
  @Column({ name: 'passing_score', default: 70 })
  passingScore: number;

  @Column({ name: 'max_attempts', default: 3 })
  maxAttempts: number;

  @Column({ name: 'is_randomized', default: false })
  isRandomized: boolean; @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate: Date | null;

  // Virtual property, not stored in database
  get isTest(): boolean {
    return this.timeLimitMinutes > 45;
  }

  @OneToMany(() => QuizQuestion, question => question.quiz)
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, attempt => attempt.quiz)
  attempts: QuizAttempt[];
} 