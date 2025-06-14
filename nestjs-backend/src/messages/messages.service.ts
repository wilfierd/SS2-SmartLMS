// src/messages/messages.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(senderId: number, dto: CreateMessageDto): Promise<Message> {
  const sender = await this.userRepository.findOne({ where: { id: senderId } });
  const receiver = await this.userRepository.findOne({ where: { id: dto.receiverId } });

  if (!sender || !receiver) {
    throw new Error('Sender or receiver not found');
  }

  const message = this.messageRepository.create({
    sender,
    receiver,
    content: dto.content,
  });

  const savedMessage = await this.messageRepository.save(message);

  const fullMessage = await this.messageRepository.findOne({
    where: { id: savedMessage.id },
    relations: ['sender', 'receiver'],
  });

  if (!fullMessage) {
    throw new Error('Message not found after save');
  }

  return fullMessage;
}


  async getConversation(userId: number, otherUserId: number): Promise<Message[]> {
    try {
      return this.messageRepository.find({
        where: [
          { sender: { id: userId }, receiver: { id: otherUserId } },
          { sender: { id: otherUserId }, receiver: { id: userId } },
        ],
        relations: ['sender', 'receiver'],
        order: { createdAt: 'ASC' },
      });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return [];
    }
  }

  async getRecentChats(userId: number): Promise<Message[]> {
    try {
      const query = this.messageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .leftJoinAndSelect('message.receiver', 'receiver')
        .where('message.sender.id = :userId OR message.receiver.id = :userId', { userId })
        .orderBy('message.createdAt', 'DESC');

      const allMessages = await query.getMany();

      // Group by conversation partner and get latest message for each
      const conversationMap = new Map();
      
      allMessages.forEach(message => {
        const partnerId = message.sender.id === userId ? message.receiver.id : message.sender.id;
        
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, message);
        }
      });

      return Array.from(conversationMap.values());
    } catch (error) {
      console.error('Error fetching recent chats:', error);
      return [];
    }
  }
}