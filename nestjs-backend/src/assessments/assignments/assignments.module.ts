import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AssignmentReminderService } from './assignment-reminder.service';
import { Assignment } from './entities/assignment.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CoursesModule } from '../../courses/courses.module';
import { UploadsModule } from '../../uploads/uploads.module';
import { MailerModule } from '../../mailer/mailer.module';
import { EnrollmentsModule } from '../../enrollments/enrollments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      AssignmentSubmission
    ]),
    ScheduleModule.forRoot(),
    CoursesModule,
    MailerModule,
    EnrollmentsModule,
    forwardRef(() => UploadsModule)
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentReminderService],
  exports: [AssignmentsService, AssignmentReminderService]
})
export class AssignmentsModule { } 