// src/messages/messages.controller.ts
import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateMessageDto) {
    return this.messagesService.create(req.user.id, dto);
  }

  @Get('with/:userId')
  getConversation(@Req() req, @Param('userId') userId: number) {
    return this.messagesService.getConversation(req.user.id, Number(userId));
  }

  @Get('recent')
  getRecentChats(@Req() req) {
    return this.messagesService.getRecentChats(req.user.id);
  }
}
