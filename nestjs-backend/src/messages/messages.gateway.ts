import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new UnauthorizedException('Token not provided');

      const payload = this.jwtService.verify(token);
      client.data.user = payload;

      const room = `user_${payload.id}`;
      client.join(room);
      this.logger.log(`User ${payload.id} connected (socket: ${client.id})`);

      this.server.emit('user_online', payload.id);
    } catch (error) {
      this.logger.warn(`Connection refused: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user;
    if (user?.id) {
      this.logger.log(`User ${user.id} disconnected`);
      this.server.emit('user_offline', user.id);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() payload: { message: CreateMessageDto },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data?.user?.id;
    if (!senderId) return;

    const newMessage = await this.messagesService.create(senderId, payload.message);
    const receiverRoom = `user_${payload.message.receiverId}`;
    const senderRoom = `user_${senderId}`;

    this.server.to(receiverRoom).emit('receive_message', newMessage);
    this.server.to(senderRoom).emit('receive_message', newMessage);
  }

  @SubscribeMessage('message_seen')
  handleMessageSeen(
    @MessageBody() payload: { messageId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data?.user?.id;
    if (!senderId) return;

    const receiverRoom = `user_${payload.userId}`;
    this.server.to(receiverRoom).emit('message_seen', {
      messageId: payload.messageId,
      seenBy: senderId,
    });
  }

  @SubscribeMessage('join')
  handleJoinRoom(
    @MessageBody() userId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user_${userId}`);
    this.logger.log(`Client ${client.id} joined room user_${userId}`);
  }
}
