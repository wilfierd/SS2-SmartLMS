import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Assignment } from './assignment.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'assignment_id' })
  assignmentId: number;

  @ManyToOne(() => Assignment, assignment => assignment.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_type' })
  fileType: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ nullable: true, type: 'text' })
  comments: string | null;

  @Column({ default: false, name: 'is_late' })
  isLate: boolean;

  @Column({ nullable: true, type: 'float' })
  grade: number | null;

  @Column({ nullable: true, type: 'text' })
  feedback: string | null;

  @Column({ nullable: true, name: 'graded_by' })
  gradedBy: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'graded_by' })
  grader: User;

  @Column({ nullable: true, name: 'graded_at', type: 'datetime' })
  gradedAt: Date | null;

  @CreateDateColumn({ name: 'submission_date' })
  submissionDate: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 