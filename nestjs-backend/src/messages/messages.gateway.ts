// src/messages/messages.gateway.ts
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
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { 
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], 
    credentials: true 
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private connectedUsers = new Map<string, number>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.log(`Client attempting to connect: ${client.id}`);
      
      // Get token from multiple sources
      const token = client.handshake.auth?.token || 
                   client.handshake.query?.token || 
                   client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`No token provided for client ${client.id}`);
        client.emit('error', { message: 'Authentication token required' });
        client.disconnect(true);
        return;
      }

      // Verify JWT token with explicit secret
      let payload;
      try {
        const config = this.configService.get('jwt');
        const jwtSecret = config?.secret || 
                         this.configService.get<string>('JWT_SECRET') || 
                         process.env.JWT_SECRET || 
                         'your_default_jwt_secret_for_development';
        
        payload = this.jwtService.verify(token, { secret: jwtSecret });
        this.logger.log(`Token verified for user: ${payload.sub || payload.id || payload.userId}`);
      } catch (jwtError) {
        this.logger.warn(`Invalid token for client ${client.id}: ${jwtError.message}`);
        client.emit('error', { message: 'Unauthorized', details: jwtError.message });
        client.disconnect(true);
        return;
      }

      // Handle different token payload structures
      const userId = payload.sub || payload.id || payload.userId;
      const userEmail = payload.email;
      
      if (!userId) {
        this.logger.warn(`No user ID found in token for client ${client.id}`);
        client.emit('error', { message: 'Invalid token payload' });
        client.disconnect(true);
        return;
      }

      // Store user data in socket
      client.data.user = {
        id: userId,
        email: userEmail,
        role: payload.role
      };
      
      this.connectedUsers.set(client.id, userId);

      // Join user to their personal room
      const userRoom = `user_${userId}`;
      await client.join(userRoom);
      
      this.logger.log(`User ${userId} (${userEmail}) connected successfully (socket: ${client.id})`);
      
      // Send connection confirmation
      client.emit('connected', { 
        userId: userId,
        email: userEmail,
        socketId: client.id,
        room: userRoom
      });
      
      // Notify other users that this user is online
      client.broadcast.emit('user_online', userId);

    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}:`, error);
      client.emit('error', { message: 'Connection failed', details: error.message });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = this.connectedUsers.get(client.id);
      
      if (userId) {
        this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
        this.connectedUsers.delete(client.id);
        
        // Check if user has other active connections
        const hasOtherConnections = Array.from(this.connectedUsers.values()).includes(userId);
        
        if (!hasOtherConnections) {
          client.broadcast.emit('user_offline', userId);
        }
      } else {
        this.logger.log(`Unknown client disconnected: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error for client ${client.id}:`, error);
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() payload: { message: CreateMessageDto },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const senderId = client.data?.user?.id;
      if (!senderId) {
        this.logger.warn(`Unauthorized message attempt from client ${client.id}`);
        client.emit('error', { message: 'Unauthorized - No user data' });
        return;
      }

      this.logger.log(`Processing message from user ${senderId} to user ${payload.message.receiverId}`);

      // Create message in database
      const newMessage = await this.messagesService.create(senderId, payload.message);
      
      // 🔧 FIX: Emit message to BOTH sender and receiver rooms
      const receiverRoom = `user_${payload.message.receiverId}`;
      const senderRoom = `user_${senderId}`;
      
      this.logger.log(`Emitting message to receiver room: ${receiverRoom}`);
      this.logger.log(`Emitting message to sender room: ${senderRoom}`);
      
      // Emit to receiver's room
      this.server.to(receiverRoom).emit('receive_message', newMessage);
      
      // Emit to sender's room (so they see their own message)
      this.server.to(senderRoom).emit('receive_message', newMessage);
      
      // Send confirmation to the specific sender socket
      client.emit('message_sent', { 
        messageId: newMessage.id, 
        status: 'delivered',
        timestamp: new Date(),
        message: newMessage
      });

      this.logger.log(`Message ${newMessage.id} sent successfully from ${senderId} to ${payload.message.receiverId}`);
      this.logger.log(`Message content: "${newMessage.content}"`);
      this.logger.log(`Sender info: ${JSON.stringify(newMessage.sender)}`);
      this.logger.log(`Receiver info: ${JSON.stringify(newMessage.receiver)}`);

    } catch (error) {
      this.logger.error(`Error handling message:`, error);
      client.emit('error', { message: 'Failed to send message', details: error.message });
    }
  }

  @SubscribeMessage('join')
  handleJoinRoom(
    @MessageBody() userId: number,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const authenticatedUserId = client.data?.user?.id;
      
      if (authenticatedUserId !== userId) {
        this.logger.warn(`User ${authenticatedUserId} attempted to join room for user ${userId}`);
        client.emit('error', { message: 'Cannot join another user\'s room' });
        return;
      }

      const userRoom = `user_${userId}`;
      client.join(userRoom);
      this.logger.log(`Client ${client.id} joined room ${userRoom}`);
      
      client.emit('joined_room', { room: userRoom });
      
    } catch (error) {
      this.logger.error(`Error joining room:`, error);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }

  // Debug method to check connected users
  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = this.getOnlineUsers();
    client.emit('online_users', onlineUsers);
  }

  getOnlineUsers(): number[] {
    return Array.from(new Set(this.connectedUsers.values()));
  }

  isUserOnline(userId: number): boolean {
    return Array.from(this.connectedUsers.values()).includes(userId);
  }
}