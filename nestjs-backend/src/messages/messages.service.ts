// src/messages/messages.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(senderId: number, dto: CreateMessageDto): Promise<Message> {
    const sender = await this.userRepo.findOneByOrFail({ id: senderId });
    const receiver = await this.userRepo.findOneByOrFail({ id: dto.receiverId });

    const message = this.messageRepo.create({
      sender,
      receiver,
      content: dto.content,
    });

    return this.messageRepo.save(message);
  }

  async getConversation(userA: number, userB: number): Promise<Message[]> {
    return this.messageRepo.find({
      where: [
        { sender: { id: userA }, receiver: { id: userB } },
        { sender: { id: userB }, receiver: { id: userA } },
      ],
      order: { createdAt: 'ASC' },
      relations: ['sender', 'receiver'],
    });
  }

  async getRecentChats(currentUserId: number): Promise<Message[]> {
    const messages = await this.messageRepo
    .createQueryBuilder('msg')
    .leftJoin('msg.sender', 'sender')
    .leftJoin('msg.receiver', 'receiver')
    .where('sender.id = :id OR receiver.id = :id', { id: currentUserId })
    .orderBy('msg.createdAt', 'DESC')
    .getMany();


    const uniqueChats = new Map();
    for (const msg of messages) {
      const otherId = msg.sender.id === currentUserId ? msg.receiver.id : msg.sender.id;
      if (!uniqueChats.has(otherId)) {
        uniqueChats.set(otherId, msg);
      }
    }

    return Array.from(uniqueChats.values());
  }
}
