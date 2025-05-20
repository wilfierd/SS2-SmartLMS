import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';
import { QuestionOption } from './question-option.entity';

@Entity('quiz_responses')
export class QuizResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'selected_option_id', nullable: true })
  selectedOptionId: number;

  @Column({ name: 'text_answer', type: 'text', nullable: true })
  textAnswer: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ name: 'attempt_id' })
  attemptId: number;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => QuizAttempt, attempt => attempt.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @ManyToOne(() => QuizQuestion)
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;

  @ManyToOne(() => QuestionOption, { nullable: true })
  @JoinColumn({ name: 'selected_option_id' })
  selectedOption: QuestionOption;
} 