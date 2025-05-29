import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuestionOption } from './question-option.entity';

@Entity('quiz_answer_records')
export class QuizResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attempt_id' })
  attemptId: number;

  @Column({ name: 'question_id' })
  questionId: number;

  @Column({ name: 'selected_option_id', nullable: true })
  selectedOptionId: number | null;

  @Column({ name: 'text_answer', type: 'text', nullable: true })
  textAnswer: string | null;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => QuizAttempt, attempt => attempt.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @ManyToOne(() => QuizQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;

  @ManyToOne(() => QuestionOption, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption: QuestionOption | null;
}