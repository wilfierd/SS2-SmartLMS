import { Module, DynamicModule, Global } from '@nestjs/common';
import { MailerService } from './mailer.service';
import { MailerController } from './mailer.controller';
import { MailerOptions } from './mailer.interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

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
      controllers: [MailerController],
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
      controllers: [MailerController],
      exports: [MailerService],
    };
  }

  static register(): DynamicModule {
    return {
      global: true,
      module: MailerModule,
      imports: [ConfigModule],
      controllers: [MailerController],
      providers: [{
        provide: 'MAILER_OPTIONS',
        useFactory: (configService: ConfigService) => {
          const mailHost = configService.get('MAIL_HOST', 'sandbox.smtp.mailtrap.io');
          const mailPort = parseInt(configService.get('MAIL_PORT', '2525'), 10);
          const mailSecure = configService.get('MAIL_SECURE', 'false') === 'true';
          const mailUser = configService.get('MAIL_USER', '');
          const mailPass = configService.get('MAIL_PASSWORD', '');
          const mailFrom = configService.get('MAIL_FROM', '"SmartLMS" <no-reply@smartlms.com>');

          // Log the email service being used
          if (mailHost === 'sandbox.smtp.mailtrap.io') {
            console.log('📧 Using Mailtrap SANDBOX for email testing');
            console.log('⚠️  Emails will NOT be delivered to real addresses - only captured for testing');
            console.log('🔗 Check your Mailtrap inbox at https://mailtrap.io/inboxes');
          } else if (mailHost === 'live.smtp.mailtrap.io') {
            console.log('📧 Using Mailtrap LIVE for real email delivery');
            console.log('✅ Emails will be sent to real student email addresses');
            console.log(`📍 SMTP: ${mailHost}:${mailPort}`);
            console.log(`📍 User: ${mailUser}`);
            console.log(`📍 Password: ${mailPass ? mailPass.substring(0, 4) + '***' + mailPass.substring(mailPass.length - 4) : 'NOT SET'}`);
          } else if (mailHost.includes('gmail')) {
            console.log('📧 Using Gmail SMTP for email delivery');
          } else {
            console.log(`📧 Using custom SMTP server: ${mailHost}:${mailPort}`);
          }

          // Validate required credentials
          if (!mailUser || !mailPass) {
            console.warn('⚠️  Email credentials not provided. Email functionality may not work.');
            console.warn(`📍 MAIL_USER: "${mailUser}"`);
            console.warn(`📍 MAIL_PASSWORD: "${mailPass ? 'SET' : 'NOT SET'}"`);
          }

          // Determine the correct templates path
          // In development, templates are in src/mailer/templates
          // In production/compiled, we need to look in the correct relative path
          const isProduction = process.env.NODE_ENV === 'production';
          const templatesPath = isProduction 
            ? path.join(process.cwd(), 'dist', 'mailer', 'templates')
            : path.join(__dirname, 'templates');

          console.log(`📁 Templates directory: ${templatesPath}`);

          return {
            transport: {
              host: mailHost,
              port: mailPort,
              secure: mailSecure,
              auth: {
                user: mailUser,
                pass: mailPass,
              },
              // Additional options for better reliability and Mailtrap compatibility
              pool: true,
              maxConnections: 5,
              maxMessages: 100,
              rateDelta: 1000,
              rateLimit: 5,
              // Force specific auth method for Mailtrap
              authMethod: 'PLAIN',
              tls: {
                rejectUnauthorized: false
              }
            },
            defaults: {
              from: mailFrom,
            },
            template: {
              dir: templatesPath,
              adapter: 'handlebars',
              options: {
                strict: true,
              },
            },
          };
        },
        inject: [ConfigService],
      },
        MailerService,
      ],
      exports: [MailerService],
    };
  }
} 