import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { MailerService } from '../../mailer/mailer.service';
import { EnrollmentsService } from '../../enrollments/enrollments.service';

@Injectable()
export class AssignmentReminderService {
    private readonly logger = new Logger(AssignmentReminderService.name);

    constructor(
        @InjectRepository(Assignment)
        private assignmentsRepository: Repository<Assignment>,
        private mailerService: MailerService,
        private enrollmentsService: EnrollmentsService,
    ) { }

    /**
     * Runs every day at 9:00 AM to check for assignments with upcoming due dates
     * and send reminder emails to students
     */
    @Cron('0 0 9 * * *') // Run every day at 9:00 AM
    async sendDailyAssignmentReminders() {
        try {
            this.logger.log('Starting daily assignment reminder check...');

            const now = new Date();
            const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
            const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

            // Find assignments due in 3 days
            await this.sendRemindersForDuration(now, threeDaysFromNow, '3 days');

            // Find assignments due in 1 day  
            await this.sendRemindersForDuration(now, oneDayFromNow, '1 day');

            this.logger.log('Daily assignment reminder check completed');
        } catch (error) {
            this.logger.error('Error in daily assignment reminder check:', error);
        }
    }

    /**
     * Sends reminders for assignments due within a specific duration
     */
    private async sendRemindersForDuration(now: Date, futureDate: Date, duration: string) {
        try {
            // Find assignments with due dates within the specified duration
            const assignments = await this.assignmentsRepository
                .createQueryBuilder('assignment')
                .leftJoinAndSelect('assignment.course', 'course')
                .leftJoinAndSelect('course.instructor', 'instructor')
                .where('assignment.dueDate BETWEEN :now AND :futureDate', {
                    now: now.toISOString(),
                    futureDate: futureDate.toISOString(),
                })
                .getMany();

            if (assignments.length === 0) {
                this.logger.log(`No assignments found due in ${duration}`);
                return;
            }

            this.logger.log(`Found ${assignments.length} assignments due in ${duration}`);

            // Process each assignment
            for (const assignment of assignments) {
                await this.sendRemindersForAssignment(assignment, duration);
            }
        } catch (error) {
            this.logger.error(`Error sending reminders for ${duration}:`, error);
        }
    }

    /**
     * Sends reminder emails to all enrolled students for a specific assignment
     */
    private async sendRemindersForAssignment(assignment: Assignment, duration: string) {
        try {
            this.logger.log(`Processing assignment: ${assignment.title} (ID: ${assignment.id})`);

            // Get all students enrolled in the course
            const enrolledStudents = await this.enrollmentsService.findEnrolledStudentsByCourse(assignment.courseId);

            if (enrolledStudents.length === 0) {
                this.logger.log(`No students enrolled in course ${assignment.courseId} for assignment ${assignment.id}`);
                return;
            }

            this.logger.log(`Sending reminders to ${enrolledStudents.length} students for assignment: ${assignment.title}`);

            // Send email to each enrolled student
            const emailPromises = enrolledStudents.map(async (enrollment) => {
                const student = enrollment.student;
                try {
                    await this.mailerService.sendMail({
                        to: student.email,
                        subject: `Assignment Reminder: ${assignment.title}`,
                        template: 'assignment-reminder',
                        context: {
                            studentName: `${student.firstName} ${student.lastName}`,
                            assignmentTitle: assignment.title,
                            assignmentDescription: assignment.description,
                            dueDate: this.formatDate(assignment.dueDate),
                            courseTitle: assignment.course?.title || 'Course',
                            instructorName: assignment.course?.instructor ?
                                `${assignment.course.instructor.firstName} ${assignment.course.instructor.lastName}` :
                                'Instructor',
                            maxPoints: assignment.maxPoints,
                            daysLeft: duration,
                            isUrgent: duration === '1 day',
                        },
                    });

                    this.logger.log(`Reminder sent to ${student.email} for assignment: ${assignment.title}`);
                } catch (emailError) {
                    this.logger.error(`Failed to send reminder to ${student.email}:`, emailError);
                }
            });

            // Wait for all emails to be sent
            await Promise.allSettled(emailPromises);

            this.logger.log(`Completed sending reminders for assignment: ${assignment.title}`);
        } catch (error) {
            this.logger.error(`Error processing assignment ${assignment.id}:`, error);
        }
    }

    /**
     * Manual method to send immediate reminders for testing purposes
     */
    async sendImmediateReminders(courseId?: number, assignmentId?: number) {
        try {
            this.logger.log('Sending immediate assignment reminders...');

            let assignments: Assignment[];

            if (assignmentId) {
                // Send reminder for specific assignment
                const assignment = await this.assignmentsRepository
                    .createQueryBuilder('assignment')
                    .leftJoinAndSelect('assignment.course', 'course')
                    .leftJoinAndSelect('course.instructor', 'instructor')
                    .where('assignment.id = :assignmentId', { assignmentId })
                    .getOne();

                assignments = assignment ? [assignment] : [];
            } else if (courseId) {
                // Send reminders for all assignments in a course
                assignments = await this.assignmentsRepository
                    .createQueryBuilder('assignment')
                    .leftJoinAndSelect('assignment.course', 'course')
                    .leftJoinAndSelect('course.instructor', 'instructor')
                    .where('assignment.courseId = :courseId', { courseId })
                    .andWhere('assignment.dueDate > :now', { now: new Date() })
                    .getMany();
            } else {
                // Send reminders for all upcoming assignments
                assignments = await this.assignmentsRepository
                    .createQueryBuilder('assignment')
                    .leftJoinAndSelect('assignment.course', 'course')
                    .leftJoinAndSelect('course.instructor', 'instructor')
                    .where('assignment.dueDate > :now', { now: new Date() })
                    .getMany();
            }

            if (assignments.length === 0) {
                this.logger.log('No assignments found for immediate reminders');
                return { sent: 0, message: 'No assignments found' };
            }

            let totalSent = 0;
            for (const assignment of assignments) {
                const enrolledStudents = await this.enrollmentsService.findEnrolledStudentsByCourse(assignment.courseId);
                totalSent += enrolledStudents.length;

                // Calculate days until due
                const daysUntilDue = Math.ceil((assignment.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const duration = daysUntilDue <= 1 ? '1 day' : `${daysUntilDue} days`;

                await this.sendRemindersForAssignment(assignment, duration);
            }

            this.logger.log(`Immediate reminders sent to ${totalSent} students for ${assignments.length} assignments`);
            return {
                sent: totalSent,
                assignments: assignments.length,
                message: `Successfully sent reminders to ${totalSent} students for ${assignments.length} assignments`
            };
        } catch (error) {
            this.logger.error('Error sending immediate reminders:', error);
            throw error;
        }
    }

    /**
     * Get upcoming assignments that will trigger reminders
     */
    async getUpcomingAssignments(days: number = 7) {
        try {
            const now = new Date();
            const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

            const assignments = await this.assignmentsRepository
                .createQueryBuilder('assignment')
                .leftJoinAndSelect('assignment.course', 'course')
                .leftJoinAndSelect('course.instructor', 'instructor')
                .where('assignment.dueDate BETWEEN :now AND :futureDate', {
                    now: now.toISOString(),
                    futureDate: futureDate.toISOString(),
                })
                .orderBy('assignment.dueDate', 'ASC')
                .getMany();

            // Get student counts for each assignment
            const assignmentsWithStudentCount = await Promise.all(
                assignments.map(async (assignment) => {
                    const enrolledStudents = await this.enrollmentsService.findEnrolledStudentsByCourse(assignment.courseId);
                    const daysUntilDue = Math.ceil((assignment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                    return {
                        id: assignment.id,
                        title: assignment.title,
                        courseTitle: assignment.course?.title || 'Course',
                        dueDate: assignment.dueDate,
                        daysUntilDue,
                        studentCount: enrolledStudents.length,
                        maxPoints: assignment.maxPoints,
                    };
                })
            );

            return assignmentsWithStudentCount;
        } catch (error) {
            this.logger.error('Error getting upcoming assignments:', error);
            throw error;
        }
    }

    /**
     * Formats date for display in emails
     */
    private formatDate(date: Date): string {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}
