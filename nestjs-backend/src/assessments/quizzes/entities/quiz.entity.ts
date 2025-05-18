import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
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
  description: string;

  @Column({ name: 'time_limit_minutes', default: 60 })
  timeLimitMinutes: number;

  @Column({ name: 'passing_score', default: 70 })
  passingScore: number;

  @Column({ name: 'is_test', default: false })
  isTest: boolean;

  @Column({ name: 'allow_multiple_attempts', default: false })
  allowMultipleAttempts: boolean;

  @Column({ name: 'show_answers', default: true })
  showAnswers: boolean;

  @Column({ name: 'randomize_questions', default: false })
  randomizeQuestions: boolean;

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

  @OneToMany(() => QuizQuestion, question => question.quiz)
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, attempt => attempt.quiz)
  attempts: QuizAttempt[];
} 