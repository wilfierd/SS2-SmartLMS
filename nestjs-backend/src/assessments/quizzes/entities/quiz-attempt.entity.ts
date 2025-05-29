import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Quiz } from './quiz.entity';
import { User } from '../../../users/entities/user.entity';
import { QuizResponse } from './quiz-response.entity';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'start_time', type: 'datetime' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'datetime', nullable: true })
  endTime: Date | null;

  @Column({ type: 'float', nullable: true })
  score: number;

  @Column({ name: 'is_passing', default: false })
  passed: boolean;

  // Computed property - quiz is completed when endTime is set
  get isCompleted(): boolean {
    return this.endTime !== null && this.endTime !== undefined;
  }

  @Column({ name: 'quiz_id' })
  quizId: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => Quiz, quiz => quiz.attempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @OneToMany(() => QuizResponse, response => response.attempt)
  responses: QuizResponse[];
}