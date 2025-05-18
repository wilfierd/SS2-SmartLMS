import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Quiz } from './quiz.entity';
import { QuestionOption } from './question-option.entity';
import { FillInAnswer } from './fill-in-answer.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  FILL_IN_BLANK = 'fill_in_blank',
}

@Entity('quiz_questions')
export class QuizQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE
  })
  questionType: QuestionType;

  @Column({ name: 'image_data', type: 'text', nullable: true })
  imageData: string;

  @Column({ default: 1 })
  points: number;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @Column({ name: 'quiz_id' })
  quizId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Quiz, quiz => quiz.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @OneToMany(() => QuestionOption, option => option.question)
  options: QuestionOption[];

  @OneToOne(() => FillInAnswer, answer => answer.question)
  fillInAnswer: FillInAnswer;
} 