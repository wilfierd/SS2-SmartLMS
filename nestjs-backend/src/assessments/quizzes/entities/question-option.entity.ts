import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('quiz_options')
export class QuestionOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'option_text', type: 'text' })
  optionText: string;

  @Column({ name: 'is_correct', default: false })  
  isCorrect: boolean;

  @Column({ name: 'order_index' })
  orderIndex: number;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => QuizQuestion, question => question.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;
}