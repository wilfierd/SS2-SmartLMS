import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private dataSource: DataSource
  ) { }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(user => new UserResponseDto(user));
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return new UserResponseDto(user);
  }

  async findInstructors(): Promise<any[]> {
    // Use exactly the same query as Express backend
    const [instructors] = await this.dataSource.query(`
      SELECT id, first_name, last_name, email 
      FROM users 
      WHERE role = 'instructor'
      ORDER BY first_name, last_name
    `);

    // Format exactly as Express backend does
    const formattedInstructors = instructors.map(instructor => ({
      id: instructor.id,
      name: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
      email: instructor.email
    }));

    return formattedInstructors;
  }

  async findByEmailForAuth(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findUserForProfile(userId: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User profile not found`);
    }
    return new UserResponseDto(user);
  }

  async adminCreateUser(createUserDto: AdminCreateUserDto): Promise<UserResponseDto> {
    // Check if user with email already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash: createUserDto.password, // Will be hashed by @BeforeInsert()
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      role: createUserDto.role,
      bio: createUserDto.bio,
      googleId: createUserDto.googleId,
      isPasswordChanged: createUserDto.role !== UserRole.STUDENT, // Students need to change password initially
    });

    const savedUser = await this.usersRepository.save(user);
    return new UserResponseDto(savedUser);
  }

  async adminUpdateUser(id: number, updateUserDto: AdminUpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if attempting to change the last admin
    if (user.role === UserRole.ADMIN &&
      updateUserDto.role &&
      updateUserDto.role !== UserRole.ADMIN) {
      const adminCount = await this.usersRepository.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot change the last admin user\'s role');
      }
    }

    // Update user fields
    if (updateUserDto.firstName !== undefined) {
      user.firstName = updateUserDto.firstName;
    }

    if (updateUserDto.lastName !== undefined) {
      user.lastName = updateUserDto.lastName;
    }

    if (updateUserDto.role !== undefined) {
      user.role = updateUserDto.role;
    }

    if (updateUserDto.bio !== undefined) {
      user.bio = updateUserDto.bio;
    }

    if (updateUserDto.isPasswordChanged !== undefined) {
      user.isPasswordChanged = updateUserDto.isPasswordChanged;
    }

    // Handle password update separately
    if (updateUserDto.password) {
      user.passwordHash = updateUserDto.password; // Will be hashed by @BeforeUpdate()
      // Reset password changed flag for students, mark as changed for others
      user.isPasswordChanged = user.role !== UserRole.STUDENT;
    }

    const updatedUser = await this.usersRepository.save(user);
    return new UserResponseDto(updatedUser);
  }

  async adminDeleteUser(id: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check if attempting to delete the last admin
    if (user.role === UserRole.ADMIN) {
      const adminCount = await this.usersRepository.count({ where: { role: UserRole.ADMIN } });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot delete the last admin user');
      }
    }

    await this.usersRepository.remove(user);
  }

  async adminBatchDeleteUsers(batchDeleteDto: BatchDeleteUsersDto, currentAdminId: number): Promise<void> {
    const { userIds } = batchDeleteDto;

    // Check if current user is in the list
    if (userIds.includes(currentAdminId)) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Check for the last admin
    const adminUsers = await this.usersRepository.find({
      where: { role: UserRole.ADMIN },
      select: ['id']
    });

    const adminIds = adminUsers.map(admin => admin.id);
    const adminsBeingDeleted = userIds.filter(id => adminIds.includes(id));

    // If all admins are being deleted, prevent it
    if (adminIds.length <= adminsBeingDeleted.length) {
      throw new ForbiddenException('Cannot delete all admin users');
    }

    // Delete users in batch
    await this.usersRepository.delete(userIds);
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(changePasswordDto.currentPassword);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Update password
    user.passwordHash = changePasswordDto.newPassword; // Will be hashed by @BeforeUpdate()
    user.isPasswordChanged = true;

    await this.usersRepository.save(user);
  }

  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update password without requiring current password (for password reset)
    user.passwordHash = newPassword; // Will be hashed by @BeforeUpdate()
    user.isPasswordChanged = true;

    await this.usersRepository.save(user);
  }

  async updateUserGoogleId(userId: number, googleId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.googleId = googleId;
    await this.usersRepository.save(user);
  }
}