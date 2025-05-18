import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VirtualSessionsService } from './virtual-sessions.service';
import { SessionActivitiesService } from './session-activities.service';
import { SessionPollsService } from './session-polls.service';
import { BreakoutRoomsService } from './breakout-rooms.service';
import { CreateVirtualSessionDto } from './dto/create-virtual-session.dto';
import { UpdateVirtualSessionDto } from './dto/update-virtual-session.dto';
import { CreatePollDto as ActivityPollDto, SessionActivityDto, PollResponseDto as ActivityPollResponseDto } from './dto/activity-poll.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { PollResponseDto } from './dto/poll-response.dto';
import { CreateBreakoutRoomsDto } from './dto/breakout-room.dto';
import { CreateActivityDto } from './dto/create-activity.dto';

@ApiTags('virtual-classroom')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('virtual-classroom')
export class VirtualClassroomController {
  constructor(
    private readonly sessionsService: VirtualSessionsService,
    private readonly activitiesService: SessionActivitiesService,
    private readonly pollsService: SessionPollsService,
    private readonly breakoutRoomsService: BreakoutRoomsService
  ) {}

  @Post('sessions')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new virtual session' })
  @ApiBody({ type: CreateVirtualSessionDto })
  async createSession(
    @Body() createDto: CreateVirtualSessionDto,
    @User('id') userId: number
  ) {
    return this.sessionsService.create(userId, createDto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all virtual sessions with filtering' })
  async findAll(
    @Query() query: any,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.sessionsService.findAll(query, userId, userRole);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a virtual session by ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.sessionsService.findOne(id, userId, userRole);
  }

  @Put('sessions/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a virtual session' })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateVirtualSessionDto,
    @User('id') userId: number
  ) {
    return this.sessionsService.update(id, updateDto, userId);
  }

  @Delete('sessions/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a virtual session' })
  @ApiParam({ name: 'id', type: Number })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.sessionsService.remove(id, userId);
  }

  @Post('sessions/:id/register')
  @ApiOperation({ summary: 'Register for a session' })
  @ApiParam({ name: 'id', type: Number })
  async registerForSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password?: string },
    @User('id') userId: number
  ) {
    return this.sessionsService.registerForSession(id, userId, body.password);
  }

  @Post('sessions/:id/end')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'End an active session' })
  @ApiParam({ name: 'id', type: Number })
  async endSession(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.sessionsService.endSession(id, userId);
  }

  @Post(':id/activities')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a user activity in a virtual session' })
  async recordActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() activityDto: CreateActivityDto,
    @User('id') userId: number,
    @Request() req
  ) {
    activityDto.sessionId = id;
    activityDto.ipAddress = req.ip || req.headers['x-forwarded-for'];
    
    return this.activitiesService.recordActivity(activityDto, userId);
  }

  @Get('sessions/:id/activities')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get activities for a session' })
  @ApiParam({ name: 'id', type: Number })
  async getActivities(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.activitiesService.getSessionActivities(id);
  }

  @Post(':id/polls')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create a poll in a virtual session' })
  async createPoll(
    @Param('id', ParseIntPipe) id: number,
    @Body() pollDto: ActivityPollDto,
    @User('id') userId: number
  ) {
    const createPollDto: CreatePollDto = {
      sessionId: id,
      question: pollDto.question,
      isMultipleChoice: pollDto.isMultipleChoice || false,
      isAnonymous: pollDto.isAnonymous || false,
      options: pollDto.options.map(opt => ({
        text: opt.text,
        orderIndex: 0
      }))
    };
    
    return this.pollsService.createPoll(createPollDto, userId);
  }

  @Get(':id/polls')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all polls for a virtual session' })
  async getPolls(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.pollsService.getSessionPolls(id, userId);
  }

  @Post(':id/polls/:pollId/responses')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Respond to a poll' })
  async respondToPoll(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('pollId', ParseIntPipe) pollId: number,
    @Body() body: ActivityPollResponseDto,
    @User('id') userId: number
  ) {
    const responseDto: PollResponseDto = {
      pollId: pollId,
      optionId: body.optionId
    };
    
    return this.pollsService.respondToPoll(responseDto, userId);
  }

  @Post('sessions/:id/poll/:pollId/end')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'End a poll' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'pollId', type: Number })
  async endPoll(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('pollId', ParseIntPipe) pollId: number,
    @User('id') userId: number
  ) {
    return this.pollsService.endPoll(pollId, userId);
  }

  @Post('sessions/:id/breakout-rooms')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Create breakout rooms' })
  @ApiParam({ name: 'id', type: Number })
  async createBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @Body() createDto: CreateBreakoutRoomsDto,
    @User('id') userId: number
  ) {
    return this.breakoutRoomsService.createBreakoutRooms(sessionId, userId, createDto);
  }

  @Get('sessions/:id/breakout-rooms')
  @ApiOperation({ summary: 'Get breakout rooms for a session' })
  @ApiParam({ name: 'id', type: Number })
  async getBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    if (userRole === UserRole.STUDENT) {
      return this.breakoutRoomsService.getStudentBreakoutRoom(sessionId, userId);
    }
    return this.breakoutRoomsService.getBreakoutRoomsForSession(sessionId);
  }

  @Post('sessions/:id/breakout-rooms/:roomId/close')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Close a breakout room' })
  async closeBreakoutRoom(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @User('id') userId: number
  ) {
    return this.breakoutRoomsService.closeBreakoutRoom(roomId, userId);
  }

  @Post('sessions/:id/breakout-rooms/close-all')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Close all breakout rooms' })
  async closeAllBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @User('id') userId: number
  ) {
    return this.breakoutRoomsService.closeAllBreakoutRooms(sessionId, userId);
  }
} 