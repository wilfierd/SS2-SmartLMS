import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Assignment } from './assignment.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('assignment_submissions')
export class AssignmentSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_type' })
  fileType: string;

  @Column({ name: 'file_size' })
  fileSize: number;

  @CreateDateColumn({ name: 'submission_date' })
  submissionDate: Date;

  @Column({ nullable: true, type: 'text' })
  comments?: string;

  @Column({ name: 'is_late', default: false })
  isLate: boolean;

  @Column({ nullable: true, type: 'float' })
  grade: number;

  @Column({ nullable: true, type: 'text' })
  feedback?: string;

  @Column({ name: 'graded_at', nullable: true, type: 'datetime' })
  gradedAt?: Date;

  @Column({ name: 'assignment_id' })
  assignmentId: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @Column({ name: 'graded_by_id', nullable: true })
  gradedById: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Assignment, assignment => assignment.submissions)
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'graded_by_id' })
  gradedBy: User;
} 