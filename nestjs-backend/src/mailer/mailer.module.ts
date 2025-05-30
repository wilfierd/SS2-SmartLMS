import { Module, DynamicModule, Global } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerOptions } from './mailer.interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({})
export class MailerModule {
  static forRoot(options?: MailerOptions): DynamicModule {
    return {
      global: true,
      module: MailerModule,
      providers: [
        {
          provide: 'MAILER_OPTIONS',
          useValue: options || {},
        },
        MailerService,
      ],
      exports: [MailerService],
    };
  }

  static forRootAsync(options: {
    imports: any[];
    useFactory: (...args: any[]) => Promise<MailerOptions> | MailerOptions;
    inject: any[];
  }): DynamicModule {
    return {
      global: true,
      module: MailerModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'MAILER_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        MailerService,
      ],
      exports: [MailerService],
    };
  }
  static register(): DynamicModule {
    return {
      global: true,
      module: MailerModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'MAILER_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            transport: {
              host: configService.get('MAIL_HOST', 'smtp.example.com'),
              port: parseInt(configService.get('MAIL_PORT', '587'), 10),
              secure: configService.get('MAIL_SECURE', 'false') === 'true',
              auth: {
                user: configService.get('MAIL_USER', ''),
                pass: configService.get('MAIL_PASSWORD', ''),
              },
            },
            defaults: {
              from: configService.get('MAIL_FROM', '"SmartLMS" <no-reply@smartlms.com>'),
            },
            template: {
              dir: __dirname + '/templates',
              adapter: 'handlebars',
              options: {
                strict: true,
              },
            },
          }),
          inject: [ConfigService],
        },
        MailerService,
      ],
      exports: [MailerService],
    };
  }
} 