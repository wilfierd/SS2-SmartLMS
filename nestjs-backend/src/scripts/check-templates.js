// Script to verify email templates
// Run with: node check-templates.js

const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const chalk = require('chalk'); // For colored output

const TEMPLATES_DIR = path.join(__dirname, '..', 'src', 'mailer', 'templates');

console.log(chalk.blue('🔍 Checking email templates in:'), chalk.yellow(TEMPLATES_DIR));

// Check if templates directory exists
if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(chalk.red('❌ Templates directory not found!'));
    process.exit(1);
}

// Get all template files
const files = fs.readdirSync(TEMPLATES_DIR).filter(file => file.endsWith('.hbs'));
console.log(chalk.green(`📨 Found ${files.length} template files:`));

// Check each template for syntax errors
let hasErrors = false;

files.forEach(file => {
    const filePath = path.join(TEMPLATES_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    try {
        // Try to compile the template
        const template = handlebars.compile(fileContent);

        // Provide sample data based on the template name
        let sampleData = { year: new Date().getFullYear() };

        if (file === 'password-reset.hbs') {
            sampleData = {
                ...sampleData,
                to: 'user@example.com',
                user_email: 'user@example.com',
                resetUrl: 'https://example.com/reset/token123',
                pass_reset_link: 'https://example.com/reset/token123',
                username: 'John Doe',
                expiryHours: 24
            };
        } else if (file === 'welcome.hbs') {
            sampleData = {
                ...sampleData,
                username: 'John Doe',
                loginUrl: 'https://example.com/login'
            };
        } else if (file === 'assignment-reminder.hbs') {
            sampleData = {
                ...sampleData,
                studentName: 'John Doe',
                assignmentTitle: 'Midterm Project',
                courseName: 'Introduction to Computer Science',
                dueDate: '2025-06-14',
                assignmentUrl: 'https://example.com/assignments/123'
            };
        } else if (file === 'session-invitation.hbs') {
            sampleData = {
                ...sampleData,
                sessionTitle: 'Live Coding Session',
                courseName: 'Advanced Programming',
                instructorName: 'Dr. Smith',
                sessionDate: '2025-06-10',
                startTime: '10:00 AM',
                endTime: '11:30 AM',
                description: 'Join us for an interactive coding session!',
                sessionUrl: 'https://example.com/sessions/456'
            };
        }

        // Try to render the template with the sample data
        const result = template(sampleData);

        console.log(chalk.green(`✓ ${file}`), chalk.gray('- Template is valid'));

        // Check for missing variables (simple approach)
        const missingVars = result.match(/{{[^}]+}}/g);
        if (missingVars) {
            console.log(chalk.yellow(`⚠️  ${file} - Has potentially unused variables:`), chalk.gray(missingVars.join(', ')));
        }

    } catch (error) {
        console.error(chalk.red(`❌ ${file} - Error:`), error.message);
        hasErrors = true;
    }
});

if (hasErrors) {
    console.error(chalk.red('\n❌ One or more templates have errors. Please fix them before continuing.'));
    process.exit(1);
} else {
    console.log(chalk.green('\n✅ All templates are valid and ready to use!'));
    console.log(chalk.blue('\n💡 To check them in the browser, start your server and visit:'));
    console.log(chalk.yellow('   http://localhost:3000/api/mailer/templates\n'));
}
