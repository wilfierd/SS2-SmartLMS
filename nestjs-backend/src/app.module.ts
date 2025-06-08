import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionTrackingMiddleware } from './common/middleware/session-tracking.middleware';
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
import { DiscussionsModule } from './discussions/discussions.module';
import { RecommendationModule } from './recommendations/recommendation.module';
import { SearchModule } from './search/search.module';
import { UserActivity } from './users/entities/user-activity.entity';
import { UserSession } from './users/entities/user-session.entity';

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
    TypeOrmModule.forFeature([UserActivity, UserSession]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }), UsersModule,
    AuthModule,
    CoursesModule,
    DepartmentsModule,
    EnrollmentsModule,
    VirtualClassroomModule,
    MailerModule.register(), UploadsModule,
    AssessmentsModule,
    DiscussionsModule,
    RecommendationModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SessionTrackingMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}