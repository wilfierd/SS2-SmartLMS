import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan, Not, IsNull } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Express } from 'express';
import { User, UserRole } from './entities/user.entity';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserActivityDto } from './dto/user-activity.dto';
import { UserSessionDto } from './dto/user-session.dto';
import { UserActivity, ActivityType } from './entities/user-activity.entity';
import { UserSession } from './entities/user-session.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserActivity)
    private activitiesRepository: Repository<UserActivity>,
    @InjectRepository(UserSession)
    private sessionsRepository: Repository<UserSession>,
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

    // Debug logging
    console.log('User ID:', userId);
    console.log('User email:', user.email);
    console.log('Current password from request:', changePasswordDto.currentPassword);
    console.log('Stored password hash length:', user.passwordHash ? user.passwordHash.length : 'null');
    console.log('Stored password hash preview:', user.passwordHash ? user.passwordHash.substring(0, 20) + '...' : 'null');

    // Verify current password
    const isPasswordValid = await user.comparePassword(changePasswordDto.currentPassword);
    
    console.log('Password comparison result:', isPasswordValid);

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
  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user fields if provided
    if (updateProfileDto.firstName !== undefined) {
      user.firstName = updateProfileDto.firstName;
    }

    if (updateProfileDto.lastName !== undefined) {
      user.lastName = updateProfileDto.lastName;
    }

    if (updateProfileDto.bio !== undefined) {
      user.bio = updateProfileDto.bio;
    }

    const updatedUser = await this.usersRepository.save(user);    // Log the profile update activity
    await this.logActivity(userId, ActivityType.PROFILE_UPDATE, 'Profile information updated');

    return new UserResponseDto(updatedUser);
  }

  async updateProfileImage(userId: number, file: Express.Multer.File): Promise<UserResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old profile image if exists
    if (user.profileImage) {
      const oldImagePath = path.join('./uploads/profiles', path.basename(user.profileImage));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Create profiles directory if it doesn't exist
    const profilesDir = './uploads/profiles';
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    // Update user's profile image path
    user.profileImage = `/uploads/profiles/${file.filename}`;
    const updatedUser = await this.usersRepository.save(user);

    // Log the profile image update activity
    await this.logActivity(userId, ActivityType.PROFILE_UPDATE, 'Profile image updated');

    return new UserResponseDto(updatedUser);
  }

  async getUserActivities(userId: number): Promise<UserActivityDto[]> {
    const activities = await this.activitiesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // Limit to last 50 activities
    });

    return activities.map(activity => new UserActivityDto(activity));
  }

  async getUserSessions(userId: number): Promise<UserSessionDto[]> {
    const sessions = await this.sessionsRepository.find({
      where: { userId },
      order: { loginTime: 'DESC' },
      take: 20, // Limit to last 20 sessions
    });

    return sessions.map(session => new UserSessionDto(session));
  }

  async getUserStats(userId: number): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get basic stats
    const totalActivities = await this.activitiesRepository.count({ where: { userId } });
    const totalSessions = await this.sessionsRepository.count({ where: { userId } });

    // Get recent activity count (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentActivities = await this.activitiesRepository.count({
      where: {
        userId,
        createdAt: MoreThan(thirtyDaysAgo)
      }
    });

    // Calculate total login time from sessions
    const completedSessions = await this.sessionsRepository.find({
      where: { userId, logoutTime: Not(IsNull()) },
    });

    let totalLoginTimeMinutes = 0;
    completedSessions.forEach(session => {
      if (session.logoutTime) {
        const diffMs = new Date(session.logoutTime).getTime() - new Date(session.loginTime).getTime();
        totalLoginTimeMinutes += Math.floor(diffMs / (1000 * 60));
      }
    });

    const totalLoginTimeHours = Math.floor(totalLoginTimeMinutes / 60);

    return {
      memberSince: user.createdAt,
      totalActivities,
      totalSessions,
      recentActivities,
      totalLoginTime: `${totalLoginTimeHours}h ${totalLoginTimeMinutes % 60}m`,
      averageSessionTime: completedSessions.length > 0
        ? `${Math.floor(totalLoginTimeMinutes / completedSessions.length)}m`
        : 'N/A'
    };
  }
  async logActivity(
    userId: number,
    type: ActivityType,
    description: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const activity = this.activitiesRepository.create({
      userId,
      type,
      description,
      metadata,
      ipAddress,
      userAgent,
    });

    await this.activitiesRepository.save(activity);
  }

  async exportUserData(userId: number): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user activities
    const activities = await this.activitiesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    // Get user sessions
    const sessions = await this.sessionsRepository.find({
      where: { userId },
      order: { loginTime: 'DESC' },
    });

    // Get user stats
    const stats = await this.getUserStats(userId);

    // Prepare export data
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        bio: user.bio,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      statistics: stats,
      activities: activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        metadata: activity.metadata,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        createdAt: activity.createdAt,
      })),
      sessions: sessions.map(session => ({
        id: session.id,
        loginTime: session.loginTime,
        logoutTime: session.logoutTime,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        browserInfo: session.browserInfo,
        deviceType: session.deviceType,
      })),
    };

    // Log the data export activity
    await this.logActivity(
      userId,
      ActivityType.PROFILE_UPDATE,
      'User exported their data',
      { exportedAt: new Date().toISOString() }
    );

    return exportData;
  }

  async deleteCurrentUserAccount(userId: number): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only students can delete their own accounts
    if (user.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Only student accounts can be self-deleted');
    }

    // Log the account deletion activity before deletion
    await this.logActivity(
      userId,
      ActivityType.LOGOUT,
      'User deleted their account',
      { deletedAt: new Date().toISOString() }
    );

    // Delete related data first
    await this.activitiesRepository.delete({ userId });
    await this.sessionsRepository.delete({ userId });

    // Finally delete the user
    await this.usersRepository.remove(user);
  }
}