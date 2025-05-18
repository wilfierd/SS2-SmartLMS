import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionPoll } from './entities/session-poll.entity';
import { PollOption } from './entities/poll-option.entity';
import { PollResponse } from './entities/poll-response.entity';
import { VirtualSession } from './entities/virtual-session.entity';
import { CreatePollDto } from './dto/create-poll.dto';
import { PollResponseDto } from './dto/poll-response.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class SessionPollsService {
  constructor(
    @InjectRepository(SessionPoll)
    private readonly pollRepository: Repository<SessionPoll>,
    @InjectRepository(PollOption)
    private readonly optionRepository: Repository<PollOption>,
    @InjectRepository(PollResponse)
    private readonly responseRepository: Repository<PollResponse>,
    @InjectRepository(VirtualSession)
    private readonly sessionRepository: Repository<VirtualSession>,
  ) {}

  async createPoll(pollDto: CreatePollDto, userId: number): Promise<SessionPoll> {
    const newPoll = new SessionPoll();
    newPoll.creatorId = userId;
    newPoll.sessionId = pollDto.sessionId;
    newPoll.question = pollDto.question;
    newPoll.isAnonymous = pollDto.isAnonymous;
    newPoll.isMultipleChoice = pollDto.isMultipleChoice;

    const savedPoll = await this.pollRepository.save(newPoll);

    // Create options
    const options = pollDto.options.map((option, index) => {
      const pollOption = new PollOption();
      pollOption.pollId = savedPoll.id;
      pollOption.optionText = option.text;
      pollOption.orderIndex = option.orderIndex || index;
      return pollOption;
    });

    await this.optionRepository.save(options);

    // Return poll with options
    return this.getPollWithOptions(savedPoll.id);
  }

  async getPollWithOptions(pollId: number): Promise<SessionPoll> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    const options = await this.optionRepository.find({
      where: { pollId: pollId },
      order: { orderIndex: 'ASC' },
    });

    // Count responses for each option
    const optionsWithCounts = await Promise.all(
      options.map(async (option) => {
        const count = await this.responseRepository.count({
          where: { optionId: option.id },
        });
        return { ...option, count };
      }),
    );

    return {
      ...poll,
      options: optionsWithCounts,
    } as SessionPoll;
  }

  async getSessionPolls(sessionId: number, userId: number): Promise<SessionPoll[]> {
    const polls = await this.pollRepository.find({
      where: { sessionId: sessionId },
      order: { createdAt: 'DESC' },
    });

    // Add options and response counts to each poll
    return Promise.all(
      polls.map(async (poll) => {
        const options = await this.optionRepository.find({
          where: { pollId: poll.id },
          order: { orderIndex: 'ASC' },
        });

        // Count responses for each option
        const optionsWithCounts = await Promise.all(
          options.map(async (option) => {
            const count = await this.responseRepository.count({
              where: { optionId: option.id },
            });
            return { ...option, count };
          }),
        );

        // Get user's responses to this poll
        const userResponseIds = await this.getUserPollResponses(poll.id, userId);

        return {
          ...poll,
          options: optionsWithCounts,
          userResponseIds,
        } as SessionPoll;
      }),
    );
  }

  async respondToPoll(responseDto: PollResponseDto, userId: number): Promise<void> {
    // Verify the poll exists
    const poll = await this.pollRepository.findOne({
      where: { id: responseDto.pollId },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    // Verify poll is still active
    if (poll.endedAt) {
      throw new BadRequestException('This poll has ended');
    }

    // Verify option belongs to poll
    const option = await this.optionRepository.findOne({
      where: { id: responseDto.optionId, pollId: responseDto.pollId },
    });

    if (!option) {
      throw new NotFoundException('Option not found or does not belong to this poll');
    }

    // For single choice polls, check if user already responded
    if (!poll.isMultipleChoice) {
      const existingResponse = await this.responseRepository.findOne({
        where: { pollId: responseDto.pollId, userId: userId },
      });

      if (existingResponse) {
        throw new BadRequestException('You have already responded to this poll');
      }
    }

    // Record response
    const response = new PollResponse();
    response.pollId = responseDto.pollId;
    response.userId = userId;
    response.optionId = responseDto.optionId;
    await this.responseRepository.save(response);
  }

  private async getUserPollResponses(pollId: number, userId: number): Promise<number[]> {
    const responses = await this.responseRepository.find({
      where: { pollId: pollId, userId: userId },
    });
    return responses.map((response) => response.optionId);
  }

  async endPoll(pollId: number, instructorId: number): Promise<void> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.creatorId !== instructorId) {
      throw new ForbiddenException('Only the poll creator can end this poll');
    }

    // End the poll
    poll.endedAt = new Date();
    await this.pollRepository.save(poll);
  }
} 