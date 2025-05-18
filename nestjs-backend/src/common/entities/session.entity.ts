import { Entity, Index, Column, PrimaryColumn } from 'typeorm';

@Entity('user_sessions')
export class SessionEntity {
  @PrimaryColumn('varchar', { length: 255 })
  id: string;

  @Index()
  @Column('bigint')
  expiredAt: number;

  @Column('text')
  json: string;
} 