import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';

@Entity('fill_in_answers')
export class FillInAnswer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'answer_text', type: 'text' })
  answerText: string;
  
  @Column({ name: 'question_id', unique: true })
  questionId: number;

  @OneToOne(() => QuizQuestion, question => question.fillInAnswer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: QuizQuestion;
} 