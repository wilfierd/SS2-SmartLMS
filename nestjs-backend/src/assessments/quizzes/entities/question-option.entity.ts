import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('question_options')
export class QuestionOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'option_text', type: 'text' })
  optionText: string;

  @Column({ name: 'is_correct', default: false })
  isCorrect: boolean;

  @Column({ name: 'question_id' })
  questionId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => QuizQuestion, question => question.options, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;
} 