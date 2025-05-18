import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DepartmentsModule } from './departments/departments.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { VirtualClassroomModule } from './virtual-classroom/virtual-classroom.module';
import { UploadsModule } from './uploads/uploads.module';
import { MailerModule } from './mailer/mailer.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersService } from './users/users.service';
import { DepartmentsService } from './departments/departments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Department } from './departments/entities/department.entity';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CoursesModule,
    EnrollmentsModule,
    VirtualClassroomModule,
    UploadsModule,
    MailerModule.register(),
    TypeOrmModule.forFeature([User, Department]),
  ],
  controllers: [AppController],
  providers: [AppService, UsersService, DepartmentsService],
})
export class AppModule {}
