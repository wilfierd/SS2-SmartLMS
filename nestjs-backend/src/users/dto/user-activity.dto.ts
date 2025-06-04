import { ApiProperty } from '@nestjs/swagger';
import { ActivityType } from '../entities/user-activity.entity';

export class UserActivityDto {
    @ApiProperty()
    id: number;

    @ApiProperty({ enum: ActivityType })
    type: ActivityType;

    @ApiProperty()
    description: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty({ required: false })
    metadata?: any;

    constructor(activity: any) {
        this.id = activity.id;
        this.type = activity.type;
        this.description = activity.description;
        this.createdAt = activity.createdAt;
        this.metadata = activity.metadata;
    }
}
