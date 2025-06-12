import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Lesson } from './lesson.entity';

export enum MaterialType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  IMAGE = 'image',
  LINK = 'link'
}

@Entity('lesson_materials')
export class LessonMaterial {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, name: 'file_path', length: 512 })
  filePath: string;

  @Column({ nullable: true, name: 'external_url', length: 512 })
  externalUrl: string;
  @Column({
    type: 'enum',
    enum: MaterialType,
    name: 'material_type'
  })
  materialType: MaterialType;

  @Column({ name: 'file_type', nullable: true })
  fileType: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number;
  @Column({ name: 'lesson_id' })
  lessonId: number;

  @ManyToOne(() => Lesson, lesson => lesson.materials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 