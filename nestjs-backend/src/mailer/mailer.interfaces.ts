import { SendMailOptions, Transport, TransportOptions } from 'nodemailer';

export interface MailerOptions {
  transport?: Transport | TransportOptions | string;
  defaults?: SendMailOptions;
  template?: {
    dir?: string;
    adapter?: 'handlebars' | 'pug' | 'ejs';
    options?: {
      strict?: boolean;
      [key: string]: any;
    };
  };
}

export interface EmailTemplate<T = any> {
  subject: string;
  template?: string;  // Name of the template file without extension
  html?: string;      // Direct HTML content (used if template is not provided)
  context?: T;        // Template variables
}

export interface SendMailDto {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  context?: Record<string, any>;
  attachments?: Array<{
    filename?: string;
    content?: any;
    path?: string;
    contentType?: string;
    cid?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
} 