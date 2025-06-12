import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Course } from './course.entity';
import { Lesson } from './lesson.entity';

@Entity('course_modules')
export class CourseModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ type: 'int', name: 'order_index' })
  orderIndex: number;

  @Column({ default: false, name: 'is_published' })
  isPublished: boolean;
  @Column({ name: 'course_id' })
  courseId: number;

  @ManyToOne(() => Course, course => course.modules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @OneToMany(() => Lesson, lesson => lesson.module)
  lessons: Lesson[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 