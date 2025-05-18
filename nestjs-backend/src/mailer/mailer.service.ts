import { Injectable, Inject, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { MailerOptions, EmailTemplate, SendMailDto } from './mailer.interfaces';

// Handle nodemailer-express-handlebars import
let nodemailerHbs: any;
try {
  nodemailerHbs = require('nodemailer-express-handlebars');
} catch (error) {
  console.warn('nodemailer-express-handlebars not available, templates will not work');
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter;
  private templatesDir: string;
  private defaultSender: string;

  constructor(@Inject('MAILER_OPTIONS') private options: MailerOptions) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      this.transporter = createTransport(this.options.transport);

      if (this.options.defaults) {
        this.defaultSender = this.options.defaults.from as string;
      }

      if (this.options.template) {
        this.templatesDir = this.options.template.dir || path.join(__dirname, 'templates');
        
        // Ensure templates directory exists
        if (!fs.existsSync(this.templatesDir)) {
          fs.mkdirSync(this.templatesDir, { recursive: true });
        }

        // Set up template engine (handlebars is supported by default)
        if (this.options.template.adapter === 'handlebars' && nodemailerHbs) {
          this.transporter.use('compile', nodemailerHbs({
            viewEngine: {
              defaultLayout: false,
              partialsDir: path.join(this.templatesDir, 'partials'),
              extname: '.hbs',
              ...this.options.template.options
            },
            viewPath: this.templatesDir,
            extName: '.hbs'
          }));
        } else if (this.options.template.adapter === 'handlebars') {
          this.logger.warn('Handlebars adapter requested but nodemailer-express-handlebars not available');
        }
        // Other template engines can be added here if needed
      }

      this.logger.log('Email transport initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize email transport: ${error.message}`, error.stack);
    }
  }

  async sendMail(mailOptions: SendMailDto): Promise<any> {
    try {
      if (!this.transporter) {
        this.logger.warn('Email transporter not initialized, attempting to initialize');
        this.initializeTransporter();
        
        if (!this.transporter) {
          throw new Error('Email transporter could not be initialized');
        }
      }

      // Add default sender if not provided
      if (!mailOptions.from && this.defaultSender) {
        mailOptions.from = this.defaultSender;
      }

      // Handle templates
      if (mailOptions.template) {
        // If template is provided, use handlebars template engine
        const result = await this.transporter.sendMail({
          ...mailOptions,
          template: mailOptions.template,
          context: mailOptions.context || {}
        });
        
        this.logger.log(`Email sent successfully to ${mailOptions.to}`);
        return result;
      } else {
        // Otherwise, use direct HTML or text content
        const result = await this.transporter.sendMail(mailOptions);
        this.logger.log(`Email sent successfully to ${mailOptions.to}`);
        return result;
      }
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Predefined email types
  async sendPasswordReset(to: string, resetToken: string, username: string): Promise<any> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    return this.sendMail({
      to,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        username,
        resetUrl,
        expiryHours: 24, // Token expiry time in hours
        year: new Date().getFullYear()
      }
    });
  }

  async sendWelcome(to: string, username: string): Promise<any> {
    return this.sendMail({
      to,
      subject: 'Welcome to SmartLMS',
      template: 'welcome',
      context: {
        username,
        loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        year: new Date().getFullYear()
      }
    });
  }

  async sendAssignmentReminder(to: string, studentName: string, assignment: any): Promise<any> {
    return this.sendMail({
      to,
      subject: `Reminder: ${assignment.title} due soon`,
      template: 'assignment-reminder',
      context: {
        studentName,
        assignmentTitle: assignment.title,
        courseName: assignment.course.title,
        dueDate: new Date(assignment.dueDate).toLocaleDateString(),
        assignmentUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/courses/${assignment.course.id}/assignments/${assignment.id}`
      }
    });
  }

  async sendSessionInvitation(to: string | string[], session: any): Promise<any> {
    return this.sendMail({
      to,
      subject: `Virtual Session: ${session.title}`,
      template: 'session-invitation',
      context: {
        sessionTitle: session.title,
        courseName: session.course.title,
        instructorName: `${session.instructor.firstName} ${session.instructor.lastName}`,
        sessionDate: new Date(session.sessionDate).toLocaleDateString(),
        startTime: session.startTime,
        endTime: session.endTime,
        sessionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/virtual-sessions/${session.id}`,
        description: session.description || 'No additional details provided.'
      }
    });
  }

  // Create default templates if they don't exist
  async createDefaultTemplates(): Promise<void> {
    try {
      const templates = [
        {
          name: 'welcome.hbs',
          content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to SmartLMS</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4a69bd; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to SmartLMS</h1>
    </div>
    <div class="content">
      <h2>Hello {{username}},</h2>
      <p>Welcome to SmartLMS, your all-in-one learning management system!</p>
      <p>Your account has been successfully created. You can now log in and start exploring the platform.</p>
      <p><a href="{{loginUrl}}">Click here to log in</a></p>
      <p>If you have any questions, please contact support.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} SmartLMS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        },
        {
          name: 'password-reset.hbs',
          content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Password Reset</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4a69bd; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4a69bd; color: white; text-decoration: none; border-radius: 4px; }
    .warning { color: #e74c3c; font-weight: bold; }
    .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hello {{username}},</h2>
      <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      <p>To reset your password, click the button below:</p>
      <p><a href="{{resetUrl}}" class="button">Reset My Password</a></p>
      <p class="warning">This link is valid for {{expiryHours}} hours.</p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p>{{resetUrl}}</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} SmartLMS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        },
        {
          name: 'assignment-reminder.hbs',
          content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Assignment Reminder</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4a69bd; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .date { font-weight: bold; color: #e74c3c; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4a69bd; color: white; text-decoration: none; border-radius: 4px; }
    .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Assignment Reminder</h1>
    </div>
    <div class="content">
      <h2>Hello {{studentName}},</h2>
      <p>This is a friendly reminder that you have an assignment due soon:</p>
      <p><strong>Assignment:</strong> {{assignmentTitle}}</p>
      <p><strong>Course:</strong> {{courseName}}</p>
      <p><strong>Due Date:</strong> <span class="date">{{dueDate}}</span></p>
      <p>Please make sure to submit your work before the deadline.</p>
      <p><a href="{{assignmentUrl}}" class="button">View Assignment</a></p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} SmartLMS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        },
        {
          name: 'session-invitation.hbs',
          content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Virtual Session Invitation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4a69bd; color: white; padding: 10px; text-align: center; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .details { background-color: #f9f9f9; padding: 15px; margin: 15px 0; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4a69bd; color: white; text-decoration: none; border-radius: 4px; }
    .footer { font-size: 12px; text-align: center; margin-top: 20px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Virtual Session Invitation</h1>
    </div>
    <div class="content">
      <h2>You're Invited!</h2>
      <p>You have been invited to join a virtual session.</p>
      
      <div class="details">
        <p><strong>Session:</strong> {{sessionTitle}}</p>
        <p><strong>Course:</strong> {{courseName}}</p>
        <p><strong>Instructor:</strong> {{instructorName}}</p>
        <p><strong>Date:</strong> {{sessionDate}}</p>
        <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
        <p><strong>Description:</strong> {{description}}</p>
      </div>
      
      <p><a href="{{sessionUrl}}" class="button">Join Session</a></p>
      <p>Click the button above when it's time to join the session.</p>
    </div>
    <div class="footer">
      <p>&copy; {{year}} SmartLMS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `
        }
      ];

      const writeFileAsync = promisify(fs.writeFile);
      
      for (const template of templates) {
        const filePath = path.join(this.templatesDir, template.name);
        
        if (!fs.existsSync(filePath)) {
          await writeFileAsync(filePath, template.content);
          this.logger.log(`Created template: ${template.name}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to create email templates: ${error.message}`, error.stack);
    }
  }

  // Method to verify transport configuration is working
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.initializeTransporter();
      }
      
      const verification = await this.transporter.verify();
      this.logger.log('Email transport verified successfully');
      return true;
    } catch (error) {
      this.logger.error(`Email transport verification failed: ${error.message}`, error.stack);
      return false;
    }
  }
} 