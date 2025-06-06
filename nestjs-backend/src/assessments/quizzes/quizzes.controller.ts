import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { RequestWithUser } from '../../common/interfaces/request-with-user.interface';

// Controller for regular quizzes
@ApiTags('quizzes')
@Controller('courses/:courseId/quizzes')
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all quizzes for a course' })
  @ApiParam({ name: 'courseId', type: 'number' })
  async findAll(@Param('courseId') courseId: string) {
    return this.quizzesService.findAll(+courseId);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiParam({ name: 'courseId', type: 'number' })
  async create(
    @Param('courseId') courseId: string,
    @Body() createQuizDto: any,
    @Request() req,
  ) {
    // Ensure courseId from URL is set in the DTO
    createQuizDto.courseId = +courseId;

    // Map frontend field names to backend field names
    if (createQuizDto.lesson_id !== undefined) {
      createQuizDto.lessonId = createQuizDto.lesson_id;
    }
    if (createQuizDto.time_limit_minutes !== undefined) {
      createQuizDto.timeLimitMinutes = createQuizDto.time_limit_minutes;
    }
    if (createQuizDto.passing_score !== undefined) {
      createQuizDto.passingScore = createQuizDto.passing_score;
    }
    if (createQuizDto.max_attempts !== undefined) {
      createQuizDto.maxAttempts = createQuizDto.max_attempts;
    }
    if (createQuizDto.is_randomized !== undefined) {
      createQuizDto.isRandomized = createQuizDto.is_randomized;
    }
    if (createQuizDto.start_date !== undefined) {
      createQuizDto.startDate = createQuizDto.start_date;
    }
    if (createQuizDto.end_date !== undefined) {
      createQuizDto.endDate = createQuizDto.end_date;
    }

    // Set defaults if not provided
    createQuizDto.timeLimitMinutes = createQuizDto.timeLimitMinutes || 30;
    createQuizDto.isTest = false;

    return this.quizzesService.create(
      createQuizDto,
      req.user.id,
    );
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a single quiz' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.findOne(id, req.user.userId, req.user.role);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a quiz' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: any,
    @Request() req,
  ) {
    // Map frontend field names to backend field names
    if (updateQuizDto.lesson_id !== undefined) {
      updateQuizDto.lessonId = updateQuizDto.lesson_id;
    }
    if (updateQuizDto.time_limit_minutes !== undefined) {
      updateQuizDto.timeLimitMinutes = updateQuizDto.time_limit_minutes;
    }
    if (updateQuizDto.passing_score !== undefined) {
      updateQuizDto.passingScore = updateQuizDto.passing_score;
    }
    if (updateQuizDto.max_attempts !== undefined) {
      updateQuizDto.maxAttempts = updateQuizDto.max_attempts;
    }
    if (updateQuizDto.is_randomized !== undefined) {
      updateQuizDto.isRandomized = updateQuizDto.is_randomized;
    }
    if (updateQuizDto.start_date !== undefined) {
      updateQuizDto.startDate = updateQuizDto.start_date;
    }
    if (updateQuizDto.end_date !== undefined) {
      updateQuizDto.endDate = updateQuizDto.end_date;
    }

    return this.quizzesService.update(
      +id,
      updateQuizDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a quiz' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async remove(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.quizzesService.remove(+id, req.user.userId);
  }


  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Start a quiz attempt' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async startAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.startAttempt(id, req.user.userId);
  }

  @Post('attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit answers for a quiz attempt' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'attemptId', type: 'number' })
  async submitAttempt(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() submitDto: { responses: any[] },
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.submitAttempt(
      attemptId,
      req.user.userId,
      submitDto.responses,
    );
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all attempts for a quiz' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async getAttempts(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.getAttempts(
      id,
      req.user.userId,
      req.user.role,
    );
  }

}

// Controller for tests (reuses quiz functionality but with different settings)
@ApiTags('tests')
@Controller('courses/:courseId/tests')
export class TestsController {
  constructor(private readonly quizzesService: QuizzesService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all tests for a course' })
  @ApiParam({ name: 'courseId', type: 'number' })
  async findAll(@Param('courseId') courseId: string) {
    return this.quizzesService.findAll(+courseId);
  }
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new test' })
  @ApiParam({ name: 'courseId', type: 'number' })
  async create(
    @Param('courseId') courseId: string,
    @Body() createQuizDto: any,
    @Request() req,
  ) {
    // Ensure courseId from URL is set in the DTO
    createQuizDto.courseId = +courseId;

    // Map frontend field names to backend field names
    if (createQuizDto.lesson_id !== undefined) {
      createQuizDto.lessonId = createQuizDto.lesson_id;
    }
    if (createQuizDto.time_limit_minutes !== undefined) {
      createQuizDto.timeLimitMinutes = createQuizDto.time_limit_minutes;
    }
    if (createQuizDto.passing_score !== undefined) {
      createQuizDto.passingScore = createQuizDto.passing_score;
    }
    if (createQuizDto.max_attempts !== undefined) {
      createQuizDto.maxAttempts = createQuizDto.max_attempts;
    }
    if (createQuizDto.is_randomized !== undefined) {
      createQuizDto.isRandomized = createQuizDto.is_randomized;
    }
    if (createQuizDto.start_date !== undefined) {
      createQuizDto.startDate = createQuizDto.start_date;
    }
    if (createQuizDto.end_date !== undefined) {
      createQuizDto.endDate = createQuizDto.end_date;
    }

    // Set longer time limit to indicate it's a test
    createQuizDto.timeLimitMinutes = createQuizDto.timeLimitMinutes || 60;
    // Explicitly set as a test
    createQuizDto.isTest = true;

    return this.quizzesService.create(
      createQuizDto,
      req.user.id,
    );
  }

  // The rest of the methods are the same as QuizzesController
  // Reuse the same methods as above
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.findOne(id, req.user.userId);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateQuizDto: any,
    @Request() req,
  ) {
    // Map frontend field names to backend field names
    if (updateQuizDto.lesson_id !== undefined) {
      updateQuizDto.lessonId = updateQuizDto.lesson_id;
    }
    if (updateQuizDto.time_limit_minutes !== undefined) {
      updateQuizDto.timeLimitMinutes = updateQuizDto.time_limit_minutes;
    }
    if (updateQuizDto.passing_score !== undefined) {
      updateQuizDto.passingScore = updateQuizDto.passing_score;
    }
    if (updateQuizDto.max_attempts !== undefined) {
      updateQuizDto.maxAttempts = updateQuizDto.max_attempts;
    }
    if (updateQuizDto.is_randomized !== undefined) {
      updateQuizDto.isRandomized = updateQuizDto.is_randomized;
    }
    if (updateQuizDto.start_date !== undefined) {
      updateQuizDto.startDate = updateQuizDto.start_date;
    }
    if (updateQuizDto.end_date !== undefined) {
      updateQuizDto.endDate = updateQuizDto.end_date;
    }

    return this.quizzesService.update(
      +id,
      updateQuizDto,
      req.user.userId,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async remove(
    @Param('id') id: string,
    @Request() req,
  ) {
    return this.quizzesService.remove(+id, req.user.userId);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Start a quiz attempt' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async startAttempt(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.startAttempt(id, req.user.userId);
  }

  @Post('attempts/:attemptId/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit answers for a quiz attempt' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'attemptId', type: 'number' })
  async submitAttempt(
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() submitDto: { responses: any[] },
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.submitAttempt(
      attemptId,
      req.user.userId,
      submitDto.responses,
    );
  }

  @Get(':id/attempts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all attempts for a quiz' })
  @ApiParam({ name: 'courseId', type: 'number' })
  @ApiParam({ name: 'id', type: 'number' })
  async getAttempts(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: RequestWithUser,
  ) {
    return this.quizzesService.getAttempts(
      id,
      req.user.userId,
      req.user.role,
    );
  }


} 