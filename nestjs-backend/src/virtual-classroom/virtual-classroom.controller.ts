import { Controller, Get, Post, Body, Param, Put, Delete, ParseIntPipe, Query, Request, UseGuards, BadRequestException, HttpStatus } from '@nestjs/common';
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
import { SessionActivity } from './entities/session-activity.entity';

@ApiTags('virtual-classroom')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class VirtualClassroomController {
  constructor(
    private readonly sessionsService: VirtualSessionsService,
    private readonly activitiesService: SessionActivitiesService,
    private readonly pollsService: SessionPollsService,
    private readonly breakoutRoomsService: BreakoutRoomsService
  ) {}

  @Post('virtual-classroom/sessions')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new virtual session' })
  @ApiBody({ type: CreateVirtualSessionDto })
  async createSession(
    @Body() createDto: CreateVirtualSessionDto,
    @User('id') userId: number
  ) {
    return this.sessionsService.create(userId, createDto);
  }

  @Post('virtual-sessions')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new virtual session (Express.js compatible)' })
  @ApiBody({ type: CreateVirtualSessionDto })
  async createSessionExpress(
    @Body() createDto: CreateVirtualSessionDto,
    @Request() req
  ) {
    try {
      console.log('User from request:', req.user);
      // Ensure we have a valid userId, try multiple possible properties
      const userId = req.user?.id || req.user?.userId;
      
      if (!userId) {
        console.error('No valid userId found in request user object:', req.user);
        throw new BadRequestException('User ID is required');
      }
      
      console.log('Using userId for instructor_id:', userId);
      
      // Create the session
      const session = await this.sessionsService.create(userId, createDto);
      
      // Get the session with related entities
      const sessionWithRelations = await this.sessionsService.findOne(session.id, userId, req.user?.role);
      
      console.log('Session created successfully, returning:', {
        message: 'Session created successfully',
        session: sessionWithRelations
      });
      
      // Structure response to match server.js implementation
      return {
        message: 'Session created successfully',
        session: sessionWithRelations
      };
    } catch (error) {
      console.error('Error creating virtual session:', error);
      throw new BadRequestException(error.message || 'Failed to create session');
    }
  }

  @Get('virtual-classroom/sessions')
  @ApiOperation({ summary: 'Get all virtual sessions with filtering' })
  async findAll(
    @Query() query: any,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.sessionsService.findAll(query, userId, userRole);
  }

  @Get('virtual-sessions')
  @ApiOperation({ summary: 'Get all virtual sessions with filtering (Express.js compatible)' })
  async findAllExpress(
    @Query() query: any,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.sessionsService.findAll(query, userId, userRole);
  }

  @Get('virtual-classroom/sessions/:id')
  @ApiOperation({ summary: 'Get a virtual session by ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.sessionsService.findOne(id, userId, userRole);
  }

  @Get('virtual-sessions/:id')
  @ApiOperation({ summary: 'Get a virtual session by ID (Express.js compatible)' })
  @ApiParam({ name: 'id', type: Number })
  async findOneExpress(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number,
    @User('role') userRole: UserRole
  ) {
    return this.sessionsService.findOne(id, userId, userRole);
  }

  @Put('virtual-classroom/sessions/:id')
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

  @Put('virtual-sessions/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a virtual session (Express.js compatible)' })
  @ApiParam({ name: 'id', type: Number })
  async updateExpress(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateVirtualSessionDto,
    @User('id') userId: number
  ) {
    return this.sessionsService.update(id, updateDto, userId);
  }

  @Delete('virtual-classroom/sessions/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a virtual session' })
  @ApiParam({ name: 'id', type: Number })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.sessionsService.remove(id, userId);
  }

  @Delete('virtual-sessions/:id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a virtual session (Express.js compatible)' })
  @ApiParam({ name: 'id', type: Number })
  async deleteExpress(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.sessionsService.remove(id, userId);
  }

  @Post('virtual-classroom/sessions/:id/register')
  @ApiOperation({ summary: 'Register for a session' })
  @ApiParam({ name: 'id', type: Number })
  async registerForSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password?: string },
    @User('id') userId: number
  ) {
    return this.sessionsService.registerForSession(id, userId, body.password);
  }

  @Post('virtual-sessions/:id/register')
  @ApiOperation({ summary: 'Register for a session (Express.js compatible)' })
  @ApiParam({ name: 'id', type: Number })
  async registerForSessionExpress(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { password?: string },
    @User('id') userId: number
  ) {
    return this.sessionsService.registerForSession(id, userId, body.password);
  }

  @Post('virtual-classroom/sessions/:id/end')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'End an active session' })
  @ApiParam({ name: 'id', type: Number })
  async endSession(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.sessionsService.endSession(id, userId);
  }

  @Post('virtual-sessions/:id/end')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'End an active session (Express.js compatible)' })
  @ApiParam({ name: 'id', type: Number })
  async endSessionExpress(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.sessionsService.endSession(id, userId);
  }

  @Get('virtual-sessions/update-status')
  @ApiOperation({ summary: 'Update status of all sessions (Express.js compatible)' })
  async updateSessionStatuses() {
    try {
      return await this.sessionsService.updateSessionStatuses();
    } catch (error) {
      throw new BadRequestException('Failed to update session statuses: ' + error.message);
    }
  }

  @Post('virtual-classroom/:id/activities')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a user activity in a virtual session' })
  async recordActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() activityDto: CreateActivityDto,
    @Request() req
  ) {
    try {
      // Extract user ID - match exactly how server.js does it
      const userId = req.user?.id || req.user?.userId || req.userId;
      
      // Always record activity without validation for leave events to match server.js
      if (activityDto.action === 'leave') {
        // Create activity record first
        const activity = new SessionActivity();
        activity.sessionId = id;
        activity.userId = userId || 0; // Use 0 as fallback if no userId found
        activity.action = 'leave';
        activity.actionValue = activityDto.actionValue ? 'true' : '';
        activity.deviceInfo = activityDto.deviceInfo || '';
        activity.ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
        
        // Find the latest 'join' activity for the same session and user
        if (userId) {
          const joinActivity = await this.activitiesService.activityRepository.findOne({
            where: {
              sessionId: id,
              userId: userId,
              action: 'join',
            },
            order: {
              timestamp: 'DESC',
            },
          });

          if (joinActivity) {
            const joinTime = joinActivity.timestamp;
            const leaveTime = new Date();
            
            // Calculate duration in seconds
            activity.durationSeconds = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);
          }
        }
        
        // Save asynchronously without waiting - this prevents blocking the response
        this.activitiesService.activityRepository.save(activity)
          .catch(err => console.error('Error saving leave activity:', err));
        
        // Return immediately to match server.js
        return { message: 'Activity recorded successfully' };
      }
      
      // For non-leave actions, still record but with userId validation
      // Get IP address
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
      
      // Create activity record
      const activity = new SessionActivity();
      activity.sessionId = id;
      activity.userId = userId || 0; // Use 0 as fallback if no userId found
      activity.action = activityDto.action;
      activity.actionValue = activityDto.actionValue ? 'true' : '';
      activity.durationSeconds = 0;
      activity.deviceInfo = activityDto.deviceInfo || '';
      activity.ipAddress = ipAddress;
      
      await this.activitiesService.activityRepository.save(activity);
      
      return { message: 'Activity recorded successfully' };
    } catch (error) {
      // Always return success to match server.js behavior
      console.error('Error in recordActivity:', error);
      return { message: 'Activity recorded successfully' };
    }
  }

  @Post('virtual-sessions/:id/activity')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Record a user activity in a virtual session (Express.js compatible)' })
  async recordActivityExpress(
    @Param('id', ParseIntPipe) id: number,
    @Body() activityDto: CreateActivityDto,
    @Request() req
  ) {
    try {
      // Extract user ID - match exactly how server.js does it
      const userId = req.user?.id || req.user?.userId || req.userId;
      
      // Always record activity without validation for leave events to match server.js
      if (activityDto.action === 'leave') {
        // Create activity record first
        const activity = new SessionActivity();
        activity.sessionId = id;
        activity.userId = userId || 0; // Use 0 as fallback if no userId found
        activity.action = 'leave';
        activity.actionValue = activityDto.actionValue ? 'true' : '';
        activity.deviceInfo = activityDto.deviceInfo || '';
        activity.ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
        
        // Find the latest 'join' activity for the same session and user
        if (userId) {
          const joinActivity = await this.activitiesService.activityRepository.findOne({
            where: {
              sessionId: id,
              userId: userId,
              action: 'join',
            },
            order: {
              timestamp: 'DESC',
            },
          });

          if (joinActivity) {
            const joinTime = joinActivity.timestamp;
            const leaveTime = new Date();
            
            // Calculate duration in seconds
            activity.durationSeconds = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000);
          }
        }
        
        // Save asynchronously without waiting - this prevents blocking the response
        this.activitiesService.activityRepository.save(activity)
          .catch(err => console.error('Error saving leave activity:', err));
        
        // Return immediately to match server.js
        return { message: 'Activity recorded successfully' };
      }
      
      // For non-leave actions, still record but with userId validation
      // Get IP address
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
      
      // Create activity record
      const activity = new SessionActivity();
      activity.sessionId = id;
      activity.userId = userId || 0; // Use 0 as fallback if no userId found
      activity.action = activityDto.action;
      activity.actionValue = activityDto.actionValue ? 'true' : '';
      activity.durationSeconds = 0;
      activity.deviceInfo = activityDto.deviceInfo || '';
      activity.ipAddress = ipAddress;
      
      await this.activitiesService.activityRepository.save(activity);
      
      return { message: 'Activity recorded successfully' };
    } catch (error) {
      // Always return success to match server.js behavior
      console.error('Error in recordActivityExpress:', error);
      return { message: 'Activity recorded successfully' };
    }
  }

  @Get('virtual-classroom/sessions/:id/activities')
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

  @Post('virtual-classroom/:id/polls')
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

  @Get('virtual-classroom/:id/polls')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all polls for a virtual session' })
  async getPolls(
    @Param('id', ParseIntPipe) id: number,
    @User('id') userId: number
  ) {
    return this.pollsService.getSessionPolls(id, userId);
  }

  @Post('virtual-classroom/:id/polls/:pollId/responses')
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

  @Post('virtual-classroom/sessions/:id/poll/:pollId/end')
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

  @Post('virtual-classroom/sessions/:id/breakout-rooms')
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

  @Get('virtual-classroom/sessions/:id/breakout-rooms')
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

  @Post('virtual-classroom/sessions/:id/breakout-rooms/:roomId/close')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Close a breakout room' })
  async closeBreakoutRoom(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @User('id') userId: number
  ) {
    return this.breakoutRoomsService.closeBreakoutRoom(roomId, userId);
  }

  @Post('virtual-classroom/sessions/:id/breakout-rooms/close-all')
  @Roles(UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Close all breakout rooms' })
  async closeAllBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @User('id') userId: number
  ) {
    return this.breakoutRoomsService.closeAllBreakoutRooms(sessionId, userId);
  }
} 