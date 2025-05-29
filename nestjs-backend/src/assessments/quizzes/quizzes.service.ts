import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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
  ) { }

  async findAll(courseId: number): Promise<Quiz[]> {
    return this.quizRepository.find({
      where: { courseId },
      relations: ['questions'],
    });
  }

  async findOne(id: number, userId?: number, userRole?: string): Promise<any> {
    const quiz = await this.quizRepository.findOne({
      where: { id },
      relations: ['questions', 'questions.options', 'questions.fillInAnswer', 'course'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${id} not found`);
    }

    // For students, remove correct answers for tests (longer time limit)
    // showAnswers is removed from database, so we only check time limit to determine if answers should be shown
    if (userRole === UserRole.STUDENT && quiz.timeLimitMinutes > 45) {
      // Hide correct answers for multiple choice questions and fill-in-blank answers for tests
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

    // Get student's attempt history if student is viewing
    let attemptHistory: {
      id: number;
      score: number;
      is_passing: boolean;
      start_time: Date;
      end_time: Date | null;
    }[] = [];
    let attempts = 0;
    let canTake = true;

    if (userRole === UserRole.STUDENT && userId) {
      const studentAttempts = await this.attemptRepository.find({
        where: {
          quizId: id,
          studentId: userId,
        },
        order: { startTime: 'DESC' },
      });

      attempts = studentAttempts.length;
      attemptHistory = studentAttempts.map(attempt => ({
        id: attempt.id,
        score: attempt.score,
        is_passing: attempt.passed,
        start_time: attempt.startTime,
        end_time: attempt.endTime,
      }));

      // Check if student can take the quiz
      canTake = attempts < quiz.maxAttempts;

      // Check date restrictions
      const now = new Date();
      if (quiz.startDate && now < quiz.startDate) {
        canTake = false;
      }
      if (quiz.endDate && now > quiz.endDate) {
        canTake = false;
      }
    }

    // Transform to match frontend expectations
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      course_title: quiz.course?.title || 'Unknown Course',
      time_limit_minutes: quiz.timeLimitMinutes,
      passing_score: quiz.passingScore,
      max_attempts: quiz.maxAttempts,
      questions: quiz.questions || [],
      start_date: quiz.startDate,
      end_date: quiz.endDate,
      is_randomized: quiz.isRandomized,
      courseId: quiz.courseId,
      lessonId: quiz.lessonId,
      // Additional fields for students
      ...(userRole === UserRole.STUDENT && {
        attempts,
        canTake,
        attemptHistory
      })
    };
  }

  async create(createQuizDto: CreateQuizDto, instructorId: number): Promise<any> {
    // Check if user is instructor of the course
    await this.coursesService.checkInstructorAccess(createQuizDto.courseId, instructorId);

    // Create quiz with the new fields
    const quiz = new Quiz();
    quiz.courseId = createQuizDto.courseId;
    quiz.lessonId = createQuizDto.lessonId || null;
    quiz.title = createQuizDto.title;
    quiz.description = createQuizDto.description || null;
    quiz.timeLimitMinutes = createQuizDto.timeLimitMinutes || 30;
    quiz.passingScore = createQuizDto.passingScore || 70;
    quiz.maxAttempts = createQuizDto.maxAttempts || 3;
    quiz.isRandomized = createQuizDto.isRandomized || false;
    quiz.startDate = createQuizDto.startDate || null;
    quiz.endDate = createQuizDto.endDate || null;

    // Save it to get an actual quiz object with ID
    const savedQuiz = await this.quizRepository.save(quiz);

    // Add questions if provided
    if (createQuizDto.questions && createQuizDto.questions.length > 0) {
      await this.addQuestionsToQuiz(savedQuiz.id, createQuizDto.questions);
    }

    return this.findOne(savedQuiz.id, instructorId, UserRole.INSTRUCTOR);
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

  async startAttempt(quizId: number, userId: number): Promise<any> {
    const quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: ['questions', 'questions.options'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Check for existing incomplete attempt (endTime is null)
    const existingAttempt = await this.attemptRepository.findOne({
      where: {
        quizId,
        studentId: userId,
        endTime: IsNull(), // Use TypeORM IsNull operator
      },
    });

    if (existingAttempt) {
      // Return existing attempt with questions
      return {
        attemptId: existingAttempt.id,
        questions: quiz.questions.map(q => ({
          id: q.id,
          text: q.questionText,
          type: q.questionType,
          points: q.points,
          options: q.options || []
        }))
      };
    }

    // Create new attempt
    const newAttempt = new QuizAttempt();
    newAttempt.quizId = quizId;
    newAttempt.studentId = userId;
    newAttempt.startTime = new Date();
    newAttempt.endTime = null;

    const savedAttempt = await this.attemptRepository.save(newAttempt);

    // Return attempt with questions for the frontend
    return {
      attemptId: savedAttempt.id,
      questions: quiz.questions.map(q => ({
        id: q.id,
        text: q.questionText,
        type: q.questionType,
        points: q.points,
        options: q.options || []
      }))
    };
  }

  async submitAttempt(attemptId: number, userId: number, responses: any[]): Promise<QuizAttempt> {
    console.log('Submitting attempt:', attemptId, 'by user:', userId);
    console.log('Responses received:', JSON.stringify(responses, null, 2));

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

    if (attempt.endTime !== null) {
      throw new ForbiddenException('This attempt is already completed');
    }

    // Get all questions for this quiz
    const questions = await this.questionRepository.find({
      where: { quizId: attempt.quizId },
      relations: ['options', 'fillInAnswer'],
    });

    console.log('Found questions:', questions.length);

    // Score calculation
    let totalPoints = 0;
    let earnedPoints = 0;

    // Process each response
    for (const response of responses) {
      console.log('Processing response:', JSON.stringify(response, null, 2));

      const question = questions.find(q => q.id === response.questionId);

      if (!question) {
        console.log('Question not found for ID:', response.questionId);
        continue;
      }

      totalPoints += question.points;
      let isCorrect = false;

      if (question.questionType === 'multiple_choice' && response.selectedOptionId) {
        // Find if the selected option is correct
        const option = question.options?.find(o => o.id === response.selectedOptionId);
        console.log('Selected option:', option);

        if (option) {
          isCorrect = option.isCorrect;
          if (isCorrect) earnedPoints += question.points;

          // Save response
          try {
            const savedResponse = await this.responseRepository.save({
              attemptId,
              questionId: question.id,
              selectedOptionId: response.selectedOptionId,
              textAnswer: null,
              isCorrect,
            });
            console.log('Saved response:', savedResponse.id);
          } catch (error) {
            console.error('Error saving response:', error);
          }
        }
      } else if (question.questionType === 'fill_in_blank' && response.textAnswer) {
        // Check if the answer matches the correct answer
        if (question.fillInAnswer) {
          const correctAnswer = question.fillInAnswer.answerText.toLowerCase().trim();
          const submittedAnswer = response.textAnswer.toLowerCase().trim();
          isCorrect = correctAnswer === submittedAnswer;

          if (isCorrect) earnedPoints += question.points;

          // Save response
          try {
            const savedResponse = await this.responseRepository.save({
              attemptId,
              questionId: question.id,
              selectedOptionId: null,
              textAnswer: response.textAnswer,
              isCorrect,
            });
            console.log('Saved fill-in response:', savedResponse.id);
          } catch (error) {
            console.error('Error saving fill-in response:', error);
          }
        }
      }

      console.log(`Question ${question.id}: ${isCorrect ? 'Correct' : 'Incorrect'} (${earnedPoints}/${totalPoints})`);
    }

    // Calculate score as percentage
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= attempt.quiz.passingScore;

    console.log(`Final score: ${score}% (${earnedPoints}/${totalPoints} points)`);
    console.log(`Passed: ${passed} (required: ${attempt.quiz.passingScore}%)`);

    // Complete the attempt by setting endTime
    attempt.endTime = new Date();
    attempt.score = score;
    attempt.passed = passed;

    try {
      const savedAttempt = await this.attemptRepository.save(attempt);
      console.log('Attempt completed and saved:', savedAttempt.id);
      return savedAttempt;
    } catch (error) {
      console.error('Error saving completed attempt:', error);
      throw error;
    }
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

      // Handle both camelCase (backend) and snake_case (frontend) formats
      const questionText = questionData.questionText || questionData.question_text || 'Default question text';
      const questionType = questionData.questionType || questionData.question_type || 'multiple_choice';

      // Create question with proper data
      const question = this.questionRepository.create({
        quizId,
        questionText,
        questionType,
        points: questionData.points || 1,
        orderIndex: i
      });

      const savedQuestion = await this.questionRepository.save(question);

      // Handle different question types
      if (questionType === 'multiple_choice' && questionData.options) {
        await this.addOptionsToQuestion(savedQuestion.id, questionData.options);
      } else if (questionType === 'fill_in_blank' && questionData.fillInAnswer) {
        await this.fillInAnswerRepository.save({
          questionId: savedQuestion.id,
          answerText: questionData.fillInAnswer.answerText || questionData.fillInAnswer,
        });
      }
    }
  }
  private async addOptionsToQuestion(questionId: number, options: any[]): Promise<void> {
    for (let i = 0; i < options.length; i++) {
      const option = options[i];

      // Handle both camelCase (backend) and snake_case (frontend) formats
      const optionText = option.optionText || option.text || '';
      const isCorrect = option.isCorrect !== undefined ? option.isCorrect :
        option.is_correct !== undefined ? option.is_correct : false;

      await this.optionRepository.save({
        questionId,
        optionText,
        isCorrect,
        orderIndex: i
      });
    }
  }
}