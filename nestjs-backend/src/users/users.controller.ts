import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { BatchDeleteUsersDto } from './dto/batch-delete-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  findUserProfile(@Request() req): Promise<UserResponseDto> {
    return this.usersService.findUserForProfile(req.user.userId);
  }

  @Get('instructors')
  async findInstructors(): Promise<any[]> {
    return this.usersService.findInstructors();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post('admin-register')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminCreateUser(@Body() createUserDto: AdminCreateUserDto): Promise<UserResponseDto> {
    return this.usersService.adminCreateUser(createUserDto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminUpdateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.adminUpdateUser(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminDeleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.adminDeleteUser(id);
  }

  @Post('batch-delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminBatchDeleteUsers(
    @Body() batchDeleteDto: BatchDeleteUsersDto,
    @Request() req,
  ): Promise<void> {
    return this.usersService.adminBatchDeleteUsers(batchDeleteDto, req.user.userId);
  }

  @Post('change-password')
  changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(req.user.userId, changePasswordDto);
  }
} 