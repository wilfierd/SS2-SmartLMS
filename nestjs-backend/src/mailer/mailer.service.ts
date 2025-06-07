import { Injectable, Inject, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { MailerOptions, EmailTemplate, SendMailDto } from './mailer.interfaces';

// Handle handlebars import
let handlebars: any;
try {
  handlebars = require('handlebars');
} catch (error) {
  console.warn('handlebars not available, templates will not work');
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter;
  private templatesDir: string;
  private defaultSender: string;
  
  constructor(@Inject('MAILER_OPTIONS') private options: MailerOptions) {
    this.initializeTransporter();
    this.logger.log('Mailer service initialized with template directory: ' + this.templatesDir);
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
          this.logger.warn(`Templates directory created: ${this.templatesDir}`);
        }

        // Check if template files exist
        const templateFiles = ['password-reset.hbs', 'welcome.hbs', 'assignment-reminder.hbs', 'session-invitation.hbs'];
        templateFiles.forEach(file => {
          const filePath = path.join(this.templatesDir, file);
          if (fs.existsSync(filePath)) {
            this.logger.log(`✅ Template found: ${file}`);
          } else {
            this.logger.error(`❌ Template missing: ${file} at ${filePath}`);
          }
        });

        this.logger.log('✅ Template system configured successfully');
      }

      this.logger.log('Email transport initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize email transport: ${error.message}`, error.stack);
    }
  }

  private async renderTemplate(templateName: string, context: any): Promise<string> {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
      
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template file not found: ${templatePath}`);
      }

      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      if (!handlebars) {
        throw new Error('Handlebars not available');
      }

      const template = handlebars.compile(templateContent);
      const html = template(context);
      
      this.logger.log(`✅ Template rendered successfully: ${templateName}`);
      return html;
    } catch (error) {
      this.logger.error(`❌ Failed to render template ${templateName}: ${error.message}`);
      throw error;
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
        this.logger.log(`📧 Sending email with template: ${mailOptions.template}`);
        this.logger.log(`📧 Template context: ${JSON.stringify(mailOptions.context, null, 2)}`);
        
        // Render the template
        const html = await this.renderTemplate(mailOptions.template, mailOptions.context || {});

        // Send email with rendered HTML
        const result = await this.transporter.sendMail({
          ...mailOptions,
          html,
          // Remove template from the mail options as we've already rendered it
          template: undefined,
          context: undefined
        });

        this.logger.log(`✅ Email sent successfully to ${mailOptions.to} using template: ${mailOptions.template}`);
        return result;
      } else {
        this.logger.log(`📧 Sending email without template to: ${mailOptions.to}`);
        // Otherwise, use direct HTML or text content
        const result = await this.transporter.sendMail(mailOptions);
        this.logger.log(`✅ Email sent successfully to ${mailOptions.to}`);
        return result;
      }
    } catch (error) {
      this.logger.error(`❌ Failed to send email: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Predefined email types
  async sendPasswordReset(to: string, resetToken: string, username: string): Promise<any> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    return this.sendMail({
      to,
      subject: 'Password Reset Request - SmartLMS',
      template: 'password-reset',
      context: {
        to, // The user's email
        user_email: to, // For the new template
        resetUrl, // Kept for backward compatibility
        pass_reset_link: resetUrl, // For the new template
        username,
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

  // Method to manually recreate all templates (useful for updates)
  async recreateTemplates(): Promise<void> {
    try {
      // Simply log information - templates are now managed as files directly
      this.logger.log('Templates are now managed directly in the templates directory. No recreation needed.');
      return;
    } catch (error) {
      this.logger.error(`Failed to recreate templates: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get templates directory path
  getTemplatesDir(): string {
    return this.templatesDir;
  }
}