// src/discussions/discussions.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionPost } from './entities/discussion-post.entity';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CoursesService } from '../courses/courses.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class DiscussionsService {
  constructor(
    @InjectRepository(Discussion)
    private discussionsRepository: Repository<Discussion>,
    @InjectRepository(DiscussionPost)
    private postsRepository: Repository<DiscussionPost>,
    private coursesService: CoursesService,
  ) {}

  async createDiscussion(
    courseId: number,
    createDiscussionDto: CreateDiscussionDto,
    userId: number,
  ): Promise<Discussion> {
    // Verify course exists
    await this.coursesService.findOne(courseId);

    const discussion = this.discussionsRepository.create({
      courseId,
      title: createDiscussionDto.title,
      description: createDiscussionDto.description,
      createdBy: userId,
    });

    return this.discussionsRepository.save(discussion);
  }

  async findDiscussionsByCourse(courseId: number): Promise<Discussion[]> {
    return this.discussionsRepository.find({
      where: { courseId },
      relations: ['creator', 'posts'],
      order: { isPinned: 'DESC', updatedAt: 'DESC' },
    });
  }

  async findDiscussionWithPosts(
    courseId: number,
    discussionId: number,
  ): Promise<Discussion> {
    const discussion = await this.discussionsRepository.findOne({
      where: { id: discussionId, courseId },
      relations: ['creator', 'posts', 'posts.user', 'posts.replies', 'posts.replies.user'],
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Organize posts into threaded format
    const topLevelPosts = discussion.posts.filter(post => !post.parentPostId);
    const organizedPosts = this.organizePostsRecursively(topLevelPosts, discussion.posts);
    
    discussion.posts = organizedPosts;
    return discussion;
  }

  async updateDiscussion(
    courseId: number,
    discussionId: number,
    updateDiscussionDto: UpdateDiscussionDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Discussion> {
    const discussion = await this.discussionsRepository.findOne({
      where: { id: discussionId, courseId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Check permissions
    if (userRole === UserRole.STUDENT && discussion.createdBy !== userId) {
      throw new ForbiddenException('You can only edit your own discussions');
    }

    if (userRole === UserRole.INSTRUCTOR) {
      // Check if user is instructor of this course
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor && discussion.createdBy !== userId) {
        throw new ForbiddenException('You can only edit discussions in your courses or your own discussions');
      }
    }

    Object.assign(discussion, updateDiscussionDto);
    return this.discussionsRepository.save(discussion);
  }

  async deleteDiscussion(
    courseId: number,
    discussionId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const discussion = await this.discussionsRepository.findOne({
      where: { id: discussionId, courseId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Check permissions
    if (userRole === UserRole.STUDENT && discussion.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own discussions');
    }

    if (userRole === UserRole.INSTRUCTOR) {
      const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
      if (!isInstructor && discussion.createdBy !== userId) {
        throw new ForbiddenException('You can only delete discussions in your courses or your own discussions');
      }
    }

    await this.discussionsRepository.remove(discussion);
  }

  async createPost(
    courseId: number,
    discussionId: number,
    createPostDto: CreatePostDto,
    userId: number,
  ): Promise<DiscussionPost> {
    // Verify discussion exists and belongs to course
    const discussion = await this.discussionsRepository.findOne({
      where: { id: discussionId, courseId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.isLocked) {
      throw new ForbiddenException('This discussion is locked');
    }

    // If replying to a post, verify parent exists
    if (createPostDto.parentPostId) {
      const parentPost = await this.postsRepository.findOne({
        where: { id: createPostDto.parentPostId, discussionId },
      });

      if (!parentPost) {
        throw new NotFoundException('Parent post not found');
      }
    }

    const post = this.postsRepository.create({
      discussionId,
      userId,
      content: createPostDto.content,
      parentPostId: createPostDto.parentPostId || undefined,
    });

    return this.postsRepository.save(post);
  }

  async updatePost(
    courseId: number,
    discussionId: number,
    postId: number,
    updatePostDto: UpdatePostDto,
    userId: number,
    userRole: UserRole,
  ): Promise<DiscussionPost> {
    const post = await this.postsRepository.findOne({
      where: { id: postId, discussionId },
      relations: ['discussion'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.discussion.courseId !== courseId) {
      throw new NotFoundException('Post not found in this course');
    }

    if (post.discussion.isLocked) {
      throw new ForbiddenException('This discussion is locked');
    }

    // Check permissions
    if (post.userId !== userId && userRole !== UserRole.ADMIN) {
      if (userRole === UserRole.INSTRUCTOR) {
        const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
        if (!isInstructor) {
          throw new ForbiddenException('You can only edit your own posts');
        }
      } else {
        throw new ForbiddenException('You can only edit your own posts');
      }
    }

    post.content = updatePostDto.content;
    return this.postsRepository.save(post);
  }

  async deletePost(
    courseId: number,
    discussionId: number,
    postId: number,
    userId: number,
    userRole: UserRole,
  ): Promise<void> {
    const post = await this.postsRepository.findOne({
      where: { id: postId, discussionId },
      relations: ['discussion', 'replies'],
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.discussion.courseId !== courseId) {
      throw new NotFoundException('Post not found in this course');
    }

    if (post.discussion.isLocked) {
      throw new ForbiddenException('This discussion is locked');
    }

    // Check permissions
    if (post.userId !== userId && userRole !== UserRole.ADMIN) {
      if (userRole === UserRole.INSTRUCTOR) {
        const isInstructor = await this.coursesService.isInstructorOfCourse(courseId, userId);
        if (!isInstructor) {
          throw new ForbiddenException('You can only delete your own posts');
        }
      } else {
        throw new ForbiddenException('You can only delete your own posts');
      }
    }

    // If post has replies, mark as deleted instead of removing
    if (post.replies && post.replies.length > 0) {
      post.content = '[This post has been deleted]';
      await this.postsRepository.save(post);
    } else {
      await this.postsRepository.remove(post);
    }
  }

  private organizePostsRecursively(posts: DiscussionPost[], allPosts: DiscussionPost[]): DiscussionPost[] {
    return posts.map(post => {
      const replies = allPosts.filter(p => p.parentPostId === post.id);
      if (replies.length > 0) {
        post.replies = this.organizePostsRecursively(replies, allPosts);
      }
      return post;
    });
  }
}