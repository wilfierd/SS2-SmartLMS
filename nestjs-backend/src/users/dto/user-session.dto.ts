import { ApiProperty } from '@nestjs/swagger';

export class UserSessionDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    loginTime: Date;

    @ApiProperty({ required: false })
    logoutTime?: Date;

    @ApiProperty({ required: false })
    ipAddress?: string;

    @ApiProperty({ required: false })
    browserInfo?: string;

    @ApiProperty({ required: false })
    deviceType?: string;

    @ApiProperty()
    isActive: boolean;

    @ApiProperty()
    duration?: string;

    constructor(session: any) {
        this.id = session.id;
        this.loginTime = session.loginTime;
        this.logoutTime = session.logoutTime;
        this.ipAddress = session.ipAddress;
        this.browserInfo = session.browserInfo;
        this.deviceType = session.deviceType;
        this.isActive = session.isActive;

        // Calculate duration if session has ended
        if (session.logoutTime) {
            const diffMs = new Date(session.logoutTime).getTime() - new Date(session.loginTime).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            this.duration = `${diffHours}h ${diffMinutes}m`;
        } else if (session.isActive) {
            this.duration = 'Active';
        } else {
            this.duration = 'Unknown';
        }
    }
}
