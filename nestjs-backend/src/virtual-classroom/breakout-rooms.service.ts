import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, IsNull, In } from 'typeorm';
import { BreakoutRoom } from './entities/breakout-room.entity';
import { BreakoutRoomParticipant } from './entities/breakout-room-participant.entity';
import { VirtualSession, SessionStatus } from './entities/virtual-session.entity';
import { CreateBreakoutRoomsDto, BreakoutRoomResponseDto, StudentBreakoutRoomResponseDto } from './dto/breakout-room.dto';
import { SessionActivitiesService } from './session-activities.service';

@Injectable()
export class BreakoutRoomsService {
  private readonly logger = new Logger(BreakoutRoomsService.name);

  constructor(
    @InjectRepository(BreakoutRoom)
    private readonly breakoutRoomRepository: Repository<BreakoutRoom>,
    @InjectRepository(BreakoutRoomParticipant)
    private readonly participantRepository: Repository<BreakoutRoomParticipant>,
    @InjectRepository(VirtualSession)
    private readonly sessionRepository: Repository<VirtualSession>,
    private readonly activitiesService: SessionActivitiesService
  ) {}

  async createBreakoutRooms(
    sessionId: number,
    instructorId: number,
    dto: CreateBreakoutRoomsDto
  ): Promise<BreakoutRoomResponseDto[]> {
    // Check if session exists and is active
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Can only create breakout rooms in active sessions');
    }

    // Verify instructor is the session instructor
    if (session.instructorId !== instructorId) {
      throw new ForbiddenException('Only the session instructor can create breakout rooms');
    }

    // Check if there are active breakout rooms
    const activeRooms = await this.breakoutRoomRepository.count({
      where: {
        session_id: sessionId,
        ended_at: IsNull()
      }
    });

    if (activeRooms > 0) {
      throw new BadRequestException('There are already active breakout rooms in this session');
    }

    // Create breakout rooms
    const rooms: BreakoutRoom[] = [];
    for (let i = 0; i < dto.roomCount; i++) {
      const roomName = dto.roomNames && dto.roomNames[i] ? dto.roomNames[i] : `Breakout Room ${i + 1}`;
      
      const room = this.breakoutRoomRepository.create({
        session_id: sessionId,
        name: roomName
      });
      
      rooms.push(await this.breakoutRoomRepository.save(room));
    }

    // Get active participants
    const participantIds = await this.activitiesService.getActiveParticipants(sessionId);

    // Assign participants to rooms
    if (dto.participantAssignments) {
      // Manual assignment
      for (const [roomIndexStr, userIds] of Object.entries(dto.participantAssignments)) {
        const roomIndex = parseInt(roomIndexStr, 10);
        if (roomIndex >= 0 && roomIndex < rooms.length) {
          const roomId = rooms[roomIndex].id;
          
          for (const userId of userIds) {
            if (participantIds.includes(userId)) {
              await this.participantRepository.save({
                breakout_room_id: roomId,
                user_id: userId
              });
            }
          }
        }
      }
    } else if (dto.autoAssign) {
      // Auto-assignment (round-robin)
      for (let i = 0; i < participantIds.length; i++) {
        const roomIndex = i % rooms.length;
        const roomId = rooms[roomIndex].id;
        
        await this.participantRepository.save({
          breakout_room_id: roomId,
          user_id: participantIds[i]
        });
      }
    }

    // Return rooms with participants
    return this.getBreakoutRoomsForSession(sessionId);
  }

  async getBreakoutRoomsForSession(sessionId: number): Promise<BreakoutRoomResponseDto[]> {
    // Verify session exists
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Get all active breakout rooms for the session
    const rooms = await this.breakoutRoomRepository.find({
      where: {
        session_id: sessionId,
        ended_at: IsNull()
      }
    });

    // For each room, get the participants
    const roomResponses: BreakoutRoomResponseDto[] = [];
    
    for (const room of rooms) {
      const participants = await this.participantRepository.find({
        where: {
          breakout_room_id: room.id,
          left_at: IsNull()
        },
        relations: ['user']
      });

      roomResponses.push({
        id: room.id,
        sessionId: room.session_id,
        name: room.name,
        createdAt: room.created_at,
        endedAt: room.ended_at,
        participants: participants.map(p => ({
          id: p.id,
          userId: p.user_id,
          participantName: `${p.user.firstName} ${p.user.lastName}`,
          joinedAt: p.joined_at,
          leftAt: p.left_at
        }))
      });
    }

    return roomResponses;
  }

  async getStudentBreakoutRoom(sessionId: number, userId: number): Promise<StudentBreakoutRoomResponseDto> {
    // Verify session exists
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Find the student's assigned room
    const participant = await this.participantRepository.findOne({
      where: {
        user_id: userId,
        left_at: IsNull()
      },
      relations: ['breakoutRoom']
    });

    if (!participant || !participant.breakoutRoom || participant.breakoutRoom.session_id !== sessionId) {
      return { isInRoom: false };
    }

    // Get room with all participants
    const room = await this.breakoutRoomRepository.findOne({
      where: { id: participant.breakout_room_id }
    });

    if (!room) {
      return { isInRoom: false };
    }

    const participants = await this.participantRepository.find({
      where: {
        breakout_room_id: room.id,
        left_at: IsNull()
      },
      relations: ['user']
    });

    return {
      userRoom: {
        id: room.id,
        sessionId: room.session_id,
        name: room.name,
        createdAt: room.created_at,
        endedAt: room.ended_at,
        participants: participants.map(p => ({
          id: p.id,
          userId: p.user_id,
          participantName: `${p.user.firstName} ${p.user.lastName}`,
          joinedAt: p.joined_at,
          leftAt: p.left_at
        }))
      },
      isInRoom: true
    };
  }

  async closeBreakoutRoom(roomId: number, instructorId: number): Promise<BreakoutRoom> {
    const room = await this.breakoutRoomRepository.findOne({
      where: { id: roomId },
      relations: ['session']
    });

    if (!room) {
      throw new NotFoundException(`Breakout room with ID ${roomId} not found`);
    }

    // Verify instructor is the session instructor
    if (room.session.instructorId !== instructorId) {
      throw new ForbiddenException('Only the session instructor can close breakout rooms');
    }

    // Close the room
    room.ended_at = new Date();
    
    // Mark all participants as left
    await this.participantRepository.update(
      {
        breakout_room_id: roomId,
        left_at: IsNull()
      },
      {
        left_at: new Date()
      }
    );

    return this.breakoutRoomRepository.save(room);
  }

  async closeAllBreakoutRooms(sessionId: number, instructorId: number): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    // Verify instructor is the session instructor
    if (session.instructorId !== instructorId) {
      throw new ForbiddenException('Only the session instructor can close breakout rooms');
    }

    // Find all active breakout rooms for this session
    const rooms = await this.breakoutRoomRepository.find({
      where: {
        session_id: sessionId,
        ended_at: IsNull()
      }
    });

    // Mark rooms as ended and participants as left
    for (const room of rooms) {
      await this.closeBreakoutRoom(room.id, instructorId);
    }
  }

  async joinBreakoutRoom(roomId: number, userId: number): Promise<BreakoutRoomParticipant> {
    const room = await this.breakoutRoomRepository.findOne({
      where: { id: roomId }
    });

    if (!room) {
      throw new NotFoundException(`Breakout room with ID ${roomId} not found`);
    }

    if (room.ended_at) {
      throw new BadRequestException('This breakout room has ended');
    }

    // Check if user is already in this room
    const existingParticipant = await this.participantRepository.findOne({
      where: {
        breakout_room_id: roomId,
        user_id: userId,
        left_at: IsNull()
      }
    });

    if (existingParticipant) {
      return existingParticipant;
    }

    // Check if user is in another room in the same session
    const otherParticipation = await this.participantRepository
      .createQueryBuilder('participant')
      .innerJoin('participant.breakoutRoom', 'room')
      .where('room.session_id = :sessionId', { sessionId: room.session_id })
      .andWhere('participant.user_id = :userId', { userId })
      .andWhere('participant.left_at IS NULL')
      .getOne();

    if (otherParticipation) {
      // Leave the other room
      otherParticipation.left_at = new Date();
      await this.participantRepository.save(otherParticipation);
    }

    // Join this room
    const participant = this.participantRepository.create({
      breakout_room_id: roomId,
      user_id: userId,
      joined_at: new Date()
    });

    return this.participantRepository.save(participant);
  }

  async leaveBreakoutRoom(roomId: number, userId: number): Promise<BreakoutRoomParticipant> {
    // Find participant
    const participant = await this.participantRepository.findOne({
      where: {
        breakout_room_id: roomId,
        user_id: userId,
        left_at: IsNull()
      }
    });

    if (!participant) {
      throw new NotFoundException('You are not in this breakout room');
    }

    // Mark as left
    participant.left_at = new Date();
    return this.participantRepository.save(participant);
  }
} 