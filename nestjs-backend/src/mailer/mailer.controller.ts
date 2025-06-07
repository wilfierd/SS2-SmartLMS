import { Controller, Get, Logger } from '@nestjs/common';
import { MailerService } from './mailer.service';
import * as path from 'path';
import * as fs from 'fs';

// Define interface for template information
interface TemplateInfo {
    name: string;
    path: string;
    size: number;
}

@Controller('mailer')
export class MailerController {
    private readonly logger = new Logger(MailerController.name);

    constructor(private readonly mailerService: MailerService) { }

    @Get('templates')
    async getTemplatesInfo() {
        try {
            const templatesDir = this.mailerService.getTemplatesDir();
            let templates: TemplateInfo[] = [];

            if (fs.existsSync(templatesDir)) {
                const files = fs.readdirSync(templatesDir);
                templates = files
                    .filter(file => file.endsWith('.hbs'))
                    .map(file => ({
                        name: file,
                        path: path.join(templatesDir, file),
                        size: fs.statSync(path.join(templatesDir, file)).size,
                    }));
            }

            await this.mailerService.verifyConnection();

            return {
                status: 'success',
                templatesDirectory: templatesDir,
                templates,
                count: templates.length,
                message: 'Email template system is ready'
            };
        } catch (error) {
            this.logger.error(`Failed to get template info: ${error.message}`, error.stack);
            return {
                status: 'error',
                message: error.message,
                error: error.stack
            };
        }
    }
}
