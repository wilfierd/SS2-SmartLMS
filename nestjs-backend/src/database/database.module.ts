import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService], useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        ssl: configService.get('database.ssl'),
        connectTimeout: configService.get<number>('database.connectTimeout'),
        acquireTimeout: configService.get<number>('database.acquireTimeout'),
        timeout: configService.get<number>('database.timeout'),
        extra: configService.get('database.extra'),
        entities: [],
        synchronize: configService.get<string>('nodeEnv') === 'development',
        autoLoadEntities: true,
        logging: configService.get<string>('nodeEnv') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule { }
