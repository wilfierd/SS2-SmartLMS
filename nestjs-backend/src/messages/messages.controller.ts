// src/messages/messages.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards, Req, HttpException, HttpStatus, ParseIntPipe } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateMessageDto) {
    try {
      console.log('Creating message:', { senderId: req.user.id, dto });
      const message = await this.messagesService.create(req.user.id, dto);
      return message;
    } catch (error) {
      console.error('Error creating message:', error);
      throw new HttpException(
        'Failed to create message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('with/:userId')
  async getConversation(@Req() req, @Param('userId', ParseIntPipe) userId: number) {
    try {
      console.log('Getting conversation:', { currentUserId: req.user.id, otherUserId: userId });
      const messages = await this.messagesService.getConversation(req.user.id, userId);
      return messages;
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw new HttpException(
        'Failed to get conversation',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recent')
  async getRecentChats(@Req() req) {
    try {
      console.log('Getting recent chats for user:', req.user.id);
      const chats = await this.messagesService.getRecentChats(req.user.id);
      console.log('Recent chats found:', chats.length);
      return chats;
    } catch (error) {
      console.error('Error getting recent chats:', error);
      throw new HttpException(
        'Failed to get recent chats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}