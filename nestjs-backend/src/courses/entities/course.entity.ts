import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { CourseModule } from './course-module.entity';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UPCOMING = 'upcoming',
  ARCHIVED = 'archived'
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({
    type: 'enum',
    enum: CourseStatus,
    default: CourseStatus.DRAFT
  })
  status: CourseStatus;

  @Column({ nullable: true, name: 'enrollment_key' })
  enrollmentKey: string;

  @Column({ nullable: true, name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ nullable: true, name: 'end_date', type: 'date' })
  endDate: Date;

  @Column({ type: 'int', name: 'enrollment_limit', nullable: true })
  enrollmentLimit: number;

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean;

  @Column({ name: 'instructor_id' })
  instructorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @Column({ nullable: true, name: 'department_id' })
  departmentId: number;

  @ManyToOne(() => Department, department => department.courses, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => CourseModule, module => module.course)
  modules: CourseModule[];

  @OneToMany('VirtualSession', (session: any) => session.course)
  virtualSessions: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 