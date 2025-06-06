import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password' })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ name: 'is_password_changed', default: false })
  isPasswordChanged: boolean;

  @Column({ name: 'google_id', nullable: true })
  googleId: string;

  @Column({ name: 'profile_image', nullable: true })
  profileImage: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Use proper TypeScript type-only imports to avoid circular dependencies
  @OneToMany('VirtualSession', (session: any) => session.instructor)
  instructedSessions: any[];

  @OneToMany('SessionRegistration', (registration: any) => registration.user)
  sessionRegistrations: any[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    // Only hash the password if it's been changed
    if (this.passwordHash && this.passwordHash.length < 60) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    }
  }
  async comparePassword(attempt: string): Promise<boolean> {
    console.log('Comparing passwords...');
    console.log('Attempt:', attempt);
    console.log('Stored hash:', this.passwordHash);
    console.log('Hash length:', this.passwordHash ? this.passwordHash.length : 'null');
    
    const result = await bcrypt.compare(attempt, this.passwordHash);
    console.log('Comparison result:', result);
    
    return result;
  }
} 