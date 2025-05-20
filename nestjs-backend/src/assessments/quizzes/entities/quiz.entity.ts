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

  @Column({ name: 'course_id' })
  courseId: number;

  @Column({ name: 'lesson_id', nullable: true })
  lessonId: number;

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

  get isTest(): boolean {
    return this.timeLimitMinutes > 45;
  }

  @Column({ name: 'show_answers', default: true, nullable: true })
  showAnswers: boolean;

  @Column({ name: 'allow_retake', default: true, nullable: true })
  allowRetake: boolean;

  @Column({ name: 'randomize_questions', default: false, nullable: true })
  randomizeQuestions: boolean;

  @OneToMany(() => QuizQuestion, question => question.quiz)
  questions: QuizQuestion[];

  @OneToMany(() => QuizAttempt, attempt => attempt.quiz)
  attempts: QuizAttempt[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 