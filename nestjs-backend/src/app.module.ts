import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { DepartmentsModule } from './departments/departments.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { VirtualClassroomModule } from './virtual-classroom/virtual-classroom.module';
import { MailerModule } from './mailer/mailer.module';
import { UploadsModule } from './uploads/uploads.module';
import { AssessmentsModule } from './assessments/assessments.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host', 'localhost'),
        port: configService.get<number>('database.port', 3306),
        username: configService.get('database.username', 'root'),
        password: configService.get('database.password', ''),
        database: configService.get('database.name', 'lms_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNC', false),
        logging: configService.get<boolean>('DB_LOGGING', false),
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UsersModule,
    AuthModule,
    CoursesModule,
    DepartmentsModule,
    EnrollmentsModule,
    VirtualClassroomModule,
    MailerModule,
    UploadsModule,
    AssessmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}