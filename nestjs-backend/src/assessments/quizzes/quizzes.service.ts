import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuestionOption } from './entities/question-option.entity';
import { FillInAnswer } from './entities/fill-in-answer.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizResponse } from './entities/quiz-response.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { CoursesService } from '../../courses/courses.service';
import { UserRole } from '../../users/entities/user.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
    @InjectRepository(FillInAnswer)
    private readonly fillInAnswerRepository: Repository<FillInAnswer>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizResponse)
    private readonly responseRepository: Repository<QuizResponse>,
    private readonly coursesService: CoursesService,
  ) {}

  async findAll(courseId: number): Promise<Quiz[]> {
    return this.quizRepository.find({
      where: { courseId },
      relations: ['questions'],
    });
  }

  async findOne(id: number, userId?: number, userRole?: string): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options', 'questions.fillInAnswer'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // For students, remove correct answers unless it's a practice quiz (determined by time limit)
    // and showAnswers is true
    if (userRole === UserRole.STUDENT && !(quiz.timeLimitMinutes <= 45 && quiz.showAnswers)) {
      // Hide correct answers for multiple choice questions and fill-in-blank answers
      quiz.questions.forEach(question => {
        if (question.options) {
          question.options.forEach(option => {
            delete (option as any).isCorrect;
          });
        }
        // Remove fill-in-blank answer
        delete (question as any).fillInAnswer;
      });
    }

    return quiz;
  }

  async create(createQuizDto: CreateQuizDto, instructorId: number): Promise<Quiz> {
    // Check if user is instructor of the course
    await this.coursesService.checkInstructorAccess(createQuizDto.courseId, instructorId);

    // Create quiz without isTest field since it doesn't exist in the database
    const quizEntity = this.quizRepository.create({
      courseId: createQuizDto.courseId,
      lessonId: createQuizDto.lessonId,
      title: createQuizDto.title,
      description: createQuizDto.description,
      timeLimitMinutes: createQuizDto.timeLimitMinutes || 30,
      passingScore: createQuizDto.passingScore || 70,
      // isTest field removed since it doesn't exist in database
      showAnswers: createQuizDto.showAnswers !== false
    });
    
    // Then save it to get an actual quiz object with ID
    const quiz = await this.quizRepository.save(quizEntity);

    // Add questions if provided
    if (createQuizDto.questions && createQuizDto.questions.length > 0) {
      await this.addQuestionsToQuiz(quiz.id, createQuizDto.questions);
    }

    return this.findOne(quiz.id);
  }

  async update(id: number, updateQuizDto: any, userId: number): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // Verify user has permission
    await this.coursesService.checkInstructorAccess(quiz.courseId, userId);

    // Update basic quiz properties
    await this.quizRepository.update(id, updateQuizDto);

    // Process questions if provided
    if (updateQuizDto.questions && updateQuizDto.questions.length > 0) {
      // Remove existing questions
      await this.questionRepository.delete({ quizId: id });
      
      // Add new questions
      await this.addQuestionsToQuiz(id, updateQuizDto.questions);
    }

    return this.findOne(id);
  }

  async remove(id: number, userId: number): Promise<void> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // Verify user has permission
    await this.coursesService.checkInstructorAccess(quiz.courseId, userId);

    await this.quizRepository.remove(quiz);
  }

  async startAttempt(quizId: number, userId: number): Promise<QuizAttempt> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Check for existing incomplete attempt
    const existingAttempt = await this.attemptRepository.findOne({
      where: {
        quizId,
        studentId: userId,
        isCompleted: false,
      },
    });

    if (existingAttempt) {
      return existingAttempt;
    }

    // Create new attempt
    const attempt = this.attemptRepository.create({
      quizId,
      studentId: userId,
      startTime: new Date(),
    });

    return this.attemptRepository.save(attempt);
  }

  async submitAttempt(attemptId: number, userId: number, responses: any[]): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: {
        id: attemptId,
        studentId: userId,
      },
      relations: ['quiz'],
    });

    if (!attempt) {
      throw new NotFoundException(`Attempt with ID ${attemptId} not found or not yours`);
    }

    if (attempt.isCompleted) {
      throw new ForbiddenException('This attempt is already completed');
    }

    // Get all questions for this quiz
    const questions = await this.questionRepository.find({
      where: { quizId: attempt.quizId },
      relations: ['options', 'fillInAnswer'],
    });

    // Score calculation
    let totalPoints = 0;
    let earnedPoints = 0;

    // Process each response
    for (const response of responses) {
      const question = questions.find(q => q.id === response.questionId);
      
      if (!question) continue;
      
      totalPoints += question.points;
      let isCorrect = false;

      if (question.questionType === 'multiple_choice' && response.optionId) {
        // Find if the selected option is correct
        const option = question.options.find(o => o.id === response.optionId);
        if (option) {
          isCorrect = option.isCorrect;
          if (isCorrect) earnedPoints += question.points;

          // Save response
          await this.responseRepository.save({
            attemptId,
            questionId: question.id,
            selectedOptionId: response.optionId,
            isCorrect,
          });
        }
      } else if (question.questionType === 'fill_in_blank' && response.textAnswer) {
        // Check if the answer matches the correct answer
        if (question.fillInAnswer) {
          const correctAnswer = question.fillInAnswer.answerText.toLowerCase().trim();
          const submittedAnswer = response.textAnswer.toLowerCase().trim();
          isCorrect = correctAnswer === submittedAnswer;
          
          if (isCorrect) earnedPoints += question.points;

          // Save response
          await this.responseRepository.save({
            attemptId,
            questionId: question.id,
            textAnswer: response.textAnswer,
            isCorrect,
          });
        }
      }
    }

    // Calculate score as percentage
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.quiz.passingScore;

    // Complete the attempt
    attempt.endTime = new Date();
    attempt.score = score;
    attempt.passed = passed;
    attempt.isCompleted = true;

    return this.attemptRepository.save(attempt);
  }

  async getAttempts(quizId: number, userId: number, userRole: string): Promise<QuizAttempt[]> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    if (userRole === UserRole.STUDENT) {
      // Students can only see their own attempts
      return this.attemptRepository.find({
        where: {
          quizId,
          studentId: userId,
        },
        relations: ['student'],
        order: { startTime: 'DESC' },
      });
    } else {
      // Instructors need access to the course
      await this.coursesService.checkInstructorAccess(quiz.courseId, userId);
      
      // Return all attempts
      return this.attemptRepository.find({
        where: { quizId },
        relations: ['student'],
        order: { startTime: 'DESC' },
      });
    }
  }

  private async addQuestionsToQuiz(quizId: number, questions: any[]): Promise<void> {
    for (let i = 0; i < questions.length; i++) {
      const questionData = questions[i];
      
      // Create question
      const question = this.questionRepository.create({
        quizId,
        questionText: questionData.questionText,
        questionType: questionData.questionType,
        points: questionData.points || 1,
        orderIndex: i,
        imageData: questionData.imageData,
      });
      
      await this.questionRepository.save(question);
      
      // Handle different question types
      if (question.questionType === 'multiple_choice' && questionData.options) {
        await this.addOptionsToQuestion(question.id, questionData.options);
      } else if (question.questionType === 'fill_in_blank' && questionData.fillInAnswer) {
        await this.fillInAnswerRepository.save({
          questionId: question.id,
          answerText: questionData.fillInAnswer,
        });
      }
    }
  }

  private async addOptionsToQuestion(questionId: number, options: any[]): Promise<void> {
    for (let i = 0; i < options.length; i++) {
      await this.optionRepository.save({
        questionId,
        optionText: options[i].text,
        isCorrect: options[i].isCorrect || false,
        orderIndex: i,
      });
    }
  }
} 