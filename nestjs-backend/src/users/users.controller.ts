import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, ParseIntPipe, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserActivityDto } from './dto/user-activity.dto';
import { UserSessionDto } from './dto/user-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all users', type: [UserResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findUserProfile(@Request() req): Promise<UserResponseDto> {
    return this.usersService.findUserForProfile(req.user.userId);
  }

  @Get('instructors')
  @ApiOperation({ summary: 'Get all instructors' })
  @ApiResponse({ status: 200, description: 'List of instructors' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findInstructors(): Promise<any[]> {
    return this.usersService.findInstructors();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User details', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post('admin-register')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiBody({ type: AdminCreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 409, description: 'Conflict - Email already exists' })
  adminCreateUser(@Body() createUserDto: AdminCreateUserDto): Promise<UserResponseDto> {
    return this.usersService.adminCreateUser(createUserDto);
  }
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiBody({ type: AdminUpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  adminUpdateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.adminUpdateUser(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: 'number', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  adminDeleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.adminDeleteUser(id);
  }

  @Post('batch-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete multiple users (Admin only)' })
  @ApiBody({ type: BatchDeleteUsersDto })
  @ApiResponse({ status: 200, description: 'Users deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  adminBatchDeleteUsers(
    @Body() batchDeleteDto: BatchDeleteUsersDto,
    @Request() req,
  ): Promise<void> {
    return this.usersService.adminBatchDeleteUsers(batchDeleteDto, req.user.userId);
  }
  @Post('change-password')
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid current password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(req.user.userId, changePasswordDto);
  }
  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Post('profile-image')
  @UseInterceptors(FileInterceptor('profileImage', {
    storage: diskStorage({
      destination: './uploads/profiles',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        callback(null, `profile-${uniqueSuffix}${ext}`);
      },
    }),
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  }))
  @ApiOperation({ summary: 'Upload profile image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        profileImage: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile image uploaded successfully', type: UserResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  uploadProfileImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfileImage(req.user.userId, file);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get current user activity history' })
  @ApiResponse({ status: 200, description: 'User activities', type: [UserActivityDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserActivities(@Request() req): Promise<UserActivityDto[]> {
    return this.usersService.getUserActivities(req.user.userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get current user session history' })
  @ApiResponse({ status: 200, description: 'User sessions', type: [UserSessionDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserSessions(@Request() req): Promise<UserSessionDto[]> {
    return this.usersService.getUserSessions(req.user.userId);
  }
  @Get('stats')
  @ApiOperation({ summary: 'Get current user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getUserStats(@Request() req): Promise<any> {
    return this.usersService.getUserStats(req.user.userId);
  }

  @Get('data-export')
  @ApiOperation({ summary: 'Export user data as JSON' })
  @ApiResponse({ status: 200, description: 'User data exported successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async exportUserData(@Request() req) {
    const userData = await this.usersService.exportUserData(req.user.userId);
    return userData;
  }

  @Delete('account')
  @UseGuards(RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete current user account (Students only)' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Student role required' })
  async deleteAccount(@Request() req): Promise<{ message: string }> {
    await this.usersService.deleteCurrentUserAccount(req.user.userId);
    return { message: 'Account deleted successfully' };
  }
}