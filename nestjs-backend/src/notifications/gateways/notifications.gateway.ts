import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationsService } from '../notifications.service';
import { Notification } from '../entities/notification.entity';

interface AuthenticatedSocket extends Socket {
    userId?: number;
    userRole?: string;
}

@Injectable()
@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private userSockets: Map<number, Set<string>> = new Map();

    constructor(
        private notificationsService: NotificationsService,
        private jwtService: JwtService,
    ) { }

    afterInit(server: Server) {
        console.log('Notifications WebSocket Gateway initialized');
    }

    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Extract token from authentication
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');

            if (!token) {
                client.disconnect();
                return;
            }            // Verify JWT token
            const payload = this.jwtService.verify(token);
            client.userId = payload.sub;
            client.userRole = payload.role;

            // Add client to user's socket set
            if (client.userId && !this.userSockets.has(client.userId)) {
                this.userSockets.set(client.userId, new Set());
            }
            if (client.userId) {
                this.userSockets.get(client.userId)?.add(client.id);

                // Join user-specific room
                client.join(`user_${client.userId}`);

                console.log(`User ${client.userId} connected to notifications gateway`);

                // Send initial unread count
                const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
                client.emit('unreadCount', unreadCount);
            }

        } catch (error) {
            console.error('Authentication failed:', error);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        if (client.userId) {
            const userSockets = this.userSockets.get(client.userId);
            if (userSockets) {
                userSockets.delete(client.id);
                if (userSockets.size === 0) {
                    this.userSockets.delete(client.userId);
                }
            }
            console.log(`User ${client.userId} disconnected from notifications gateway`);
        }
    } @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @MessageBody() data: { notificationId: number },
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        try {
            if (!client.userId) {
                return { success: false, error: 'User not authenticated' };
            }

            const notification = await this.notificationsService.markAsRead(data.notificationId, client.userId);
            const unreadCount = await this.notificationsService.getUnreadCount(client.userId);

            // Send updated notification and unread count to user
            client.emit('notificationUpdated', notification);
            client.emit('unreadCount', unreadCount);

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    } @SubscribeMessage('markAllAsRead')
    async handleMarkAllAsRead(@ConnectedSocket() client: AuthenticatedSocket) {
        try {
            if (!client.userId) {
                return { success: false, error: 'User not authenticated' };
            }

            await this.notificationsService.markAllAsRead(client.userId);
            const unreadCount = await this.notificationsService.getUnreadCount(client.userId);

            client.emit('allNotificationsRead');
            client.emit('unreadCount', unreadCount);

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    } @SubscribeMessage('deleteNotification')
    async handleDeleteNotification(
        @MessageBody() data: { notificationId: number },
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        try {
            if (!client.userId) {
                return { success: false, error: 'User not authenticated' };
            }

            await this.notificationsService.remove(data.notificationId, client.userId);
            const unreadCount = await this.notificationsService.getUnreadCount(client.userId);

            client.emit('notificationDeleted', data.notificationId);
            client.emit('unreadCount', unreadCount);

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    } @SubscribeMessage('getUnreadCount')
    async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
        try {
            if (!client.userId) {
                return { success: false, error: 'User not authenticated' };
            }

            const unreadCount = await this.notificationsService.getUnreadCount(client.userId);
            client.emit('unreadCount', unreadCount);
            return { success: true, unreadCount };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Method to send notification to specific user
    async sendToUser(userId: number, event: string, data: any) {
        this.server.to(`user_${userId}`).emit(event, data);
    }

    // Method to send notification to multiple users
    async sendToUsers(userIds: number[], event: string, data: any) {
        userIds.forEach(userId => {
            this.server.to(`user_${userId}`).emit(event, data);
        });
    }

    // Method to broadcast new notification
    async broadcastNewNotification(notification: Notification) {
        await this.sendToUser(notification.userId, 'newNotification', notification);

        // Update unread count
        const unreadCount = await this.notificationsService.getUnreadCount(notification.userId);
        await this.sendToUser(notification.userId, 'unreadCount', unreadCount);
    }    // Method to check if user is online
    isUserOnline(userId: number): boolean {
        return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size || 0) > 0;
    }

    // Method to get online users count
    getOnlineUsersCount(): number {
        return this.userSockets.size;
    }

    // Method to get user's active connections count
    getUserConnectionsCount(userId: number): number {
        return this.userSockets.get(userId)?.size || 0;
    }
}
