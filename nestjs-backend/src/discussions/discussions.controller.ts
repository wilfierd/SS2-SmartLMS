// src/discussions/discussions.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('courses/:courseId/discussions')
@UseGuards(JwtAuthGuard)
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  async createDiscussion(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Body() createDiscussionDto: CreateDiscussionDto,
    @Request() req,
  ) {
    return this.discussionsService.createDiscussion(
      courseId,
      createDiscussionDto,
      req.user.userId,
    );
  }

  @Get()
  async findDiscussionsByCourse(
    @Param('courseId', ParseIntPipe) courseId: number,
  ) {
    return this.discussionsService.findDiscussionsByCourse(courseId);
  }

  @Get(':discussionId')
  async findDiscussionWithPosts(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('discussionId', ParseIntPipe) discussionId: number,
  ) {
    return this.discussionsService.findDiscussionWithPosts(courseId, discussionId);
  }

  @Put(':discussionId')
  async updateDiscussion(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Body() updateDiscussionDto: UpdateDiscussionDto,
    @Request() req,
  ) {
    return this.discussionsService.updateDiscussion(
      courseId,
      discussionId,
      updateDiscussionDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':discussionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  async deleteDiscussion(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Request() req,
  ) {
    await this.discussionsService.deleteDiscussion(
      courseId,
      discussionId,
      req.user.userId,
      req.user.role,
    );
    return { message: 'Discussion deleted successfully' };
  }

  @Post(':discussionId/posts')
  async createPost(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Body() createPostDto: CreatePostDto,
    @Request() req,
  ) {
    const post = await this.discussionsService.createPost(
      courseId,
      discussionId,
      createPostDto,
      req.user.userId,
    );
    return { message: 'Post created successfully', post };
  }

  @Put(':discussionId/posts/:postId')
  async updatePost(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Body() updatePostDto: UpdatePostDto,
    @Request() req,
  ) {
    const post = await this.discussionsService.updatePost(
      courseId,
      discussionId,
      postId,
      updatePostDto,
      req.user.userId,
      req.user.role,
    );
    return { message: 'Post updated successfully', post };
  }

  @Delete(':discussionId/posts/:postId')
  async deletePost(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('discussionId', ParseIntPipe) discussionId: number,
    @Param('postId', ParseIntPipe) postId: number,
    @Request() req,
  ) {
    await this.discussionsService.deletePost(
      courseId,
      discussionId,
      postId,
      req.user.userId,
      req.user.role,
    );
    return { message: 'Post deleted successfully' };
  }
}