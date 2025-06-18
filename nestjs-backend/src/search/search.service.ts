import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch, Index } from 'meilisearch';
import { CoursesService } from '../courses/courses.service';
import { DiscussionsService } from '../discussions/discussions.service';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import {
  SearchDto,
  SearchResponseDto,
  SearchResultDto,
  FilterOptionsResponseDto,
  ContentType,
  DifficultyLevel
} from './dto/search.dto';

export interface SearchFilters {
  department?: string;
  instructor?: string;
  type?: ContentType;
  difficulty?: DifficultyLevel;
  status?: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private meilisearch: MeiliSearch;
  private contentIndex: Index;
  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => CoursesService))
    private coursesService: CoursesService,
    @Inject(forwardRef(() => DiscussionsService))
    private discussionsService: DiscussionsService,
    private usersService: UsersService,
    private departmentsService: DepartmentsService,
  ) {
    const host = this.configService.get('MEILISEARCH_HOST', 'http://localhost:7700');
    const apiKey = this.configService.get('MEILISEARCH_API_KEY');

    this.meilisearch = new MeiliSearch({
      host,
      apiKey,
    });

    this.logger.log(`Initializing Meilisearch client with host: ${host}`);
  }

  async onModuleInit() {
    try {
      await this.initializeIndexes();
      // Delay initial indexing to allow other services to be ready
      setTimeout(() => this.indexAllContent(), 5000);
    } catch (error) {
      this.logger.error('Failed to initialize search service:', error);
    }
  }

  private async initializeIndexes() {
    try {
      // Create main content index
      this.contentIndex = this.meilisearch.index('lms_content');

      // Set primary key explicitly to avoid conflicts with multiple *Id fields
      await this.contentIndex.update({ primaryKey: 'id' });

      // Configure searchable attributes
      await this.contentIndex.updateSearchableAttributes([
        'title',
        'content',
        'instructor',
        'department',
        'tags'
      ]);

      // Configure filterable attributes
      await this.contentIndex.updateFilterableAttributes([
        'type',
        'department',
        'instructor',
        'status',
        'difficulty',
        'instructorId',
        'departmentId',
        'courseId'
      ]);

      // Configure sortable attributes
      await this.contentIndex.updateSortableAttributes([
        'createdAt',
        'title'
      ]);

      this.logger.log('Meilisearch indexes initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Meilisearch indexes:', error);
      throw error;
    }
  }

  async search(searchDto: SearchDto): Promise<SearchResponseDto> {
    try {
      const { q, limit, offset, ...filters } = searchDto;

      const searchParams: any = {
        limit: limit || 20,
        offset: offset || 0,
        attributesToHighlight: ['title', 'content'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      };

      // Build filters
      const filterArray: string[] = [];

      if (filters.type) {
        filterArray.push(`type = "${filters.type}"`);
      }

      if (filters.department) {
        filterArray.push(`department = "${filters.department}"`);
      }

      if (filters.instructor) {
        filterArray.push(`instructor = "${filters.instructor}"`);
      }

      if (filters.difficulty) {
        filterArray.push(`difficulty = "${filters.difficulty}"`);
      }

      if (filters.status) {
        filterArray.push(`status = "${filters.status}"`);
      }

      if (filterArray.length > 0) {
        searchParams.filter = filterArray;
      }

      const searchResult = await this.contentIndex.search(q, searchParams);

      return {
        results: searchResult.hits as SearchResultDto[],
        total: searchResult.estimatedTotalHits || 0,
        query: q,
        filters: filters,
      };
    } catch (error) {
      this.logger.error('Search failed:', error);
      return {
        results: [],
        total: 0,
        query: searchDto.q,
        filters: {},
      };
    }
  }

  async indexAllContent(): Promise<void> {
    try {
      this.logger.log('Starting content indexing...');

      await Promise.all([
        this.indexCourses(),
        this.indexDiscussions(),
      ]);

      this.logger.log('Content indexing completed');
    } catch (error) {
      this.logger.error('Content indexing failed:', error);
    }
  }
  private async indexCourses(): Promise<void> {
    try {
      const courses = await this.coursesService.findAll();

      const documents = courses.map(course => this.createCourseDocument(course));

      if (documents.length > 0) {
        await this.contentIndex.addDocuments(documents);
        this.logger.log(`Indexed ${documents.length} courses`);
      }
    } catch (error) {
      this.logger.error('Failed to index courses:', error);
    }
  }

  private createCourseDocument(course: any): any {
    return {
      id: `course_${course.id}`,
      title: course.title,
      content: `${course.title} ${course.description || ''}`,
      type: 'course',
      instructor: course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : '',
      instructorId: course.instructorId,
      department: course.department?.name || '',
      departmentId: course.departmentId,
      status: course.status,
      difficulty: 'intermediate',
      thumbnailUrl: course.thumbnailUrl,
      createdAt: course.createdAt.toISOString(),
      tags: [
        course.department?.name,
        course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : '',
        course.status
      ].filter(Boolean),
    };
  }

  private async indexDiscussions(): Promise<void> {
    try {
      const discussions = await this.getAllDiscussions();

      const documents = discussions.map(discussion => ({
        id: `discussion_${discussion.id}`,
        title: discussion.title,
        content: `${discussion.title} ${discussion.description || ''}`,
        type: 'discussion',
        instructor: discussion.creator ? `${discussion.creator.firstName} ${discussion.creator.lastName}` : '',
        instructorId: discussion.createdBy,
        department: discussion.course?.department?.name || '',
        departmentId: discussion.course?.departmentId,
        courseId: discussion.course?.id,
        courseTitle: discussion.course?.title || '',
        createdAt: discussion.createdAt.toISOString(),
        tags: [
          discussion.course?.department?.name,
          'discussion',
          discussion.creator ? `${discussion.creator.firstName} ${discussion.creator.lastName}` : ''
        ].filter(Boolean),
      }));

      if (documents.length > 0) {
        await this.contentIndex.addDocuments(documents);
        this.logger.log(`Indexed ${documents.length} discussions`);
      }
    } catch (error) {
      this.logger.error('Failed to index discussions:', error);
    }
  }

  private async getAllDiscussions(): Promise<any[]> {
    try {
      const courses = await this.coursesService.findAll();
      const allDiscussions: any[] = [];

      for (const course of courses) {
        try {
          const discussions = await this.discussionsService.findDiscussionsByCourse(course.id);
          const discussionsWithCourse = discussions.map(d => ({ ...d, course }));
          allDiscussions.push(...discussionsWithCourse);
        } catch (error) {
          this.logger.warn(`Failed to get discussions for course ${course.id}`);
        }
      }

      return allDiscussions;
    } catch (error) {
      this.logger.error('Failed to get all discussions:', error);
      return [];
    }
  }

  async reindexContent(): Promise<{ success: boolean; message: string }> {
    try {
      await this.contentIndex.deleteAllDocuments();
      await this.indexAllContent();
      return { success: true, message: 'Content reindexed successfully' };
    } catch (error) {
      this.logger.error('Reindexing failed:', error);
      return { success: false, message: 'Reindexing failed' };
    }
  }

  async getFilterOptions(): Promise<FilterOptionsResponseDto> {
    try {
      const [courses, departments] = await Promise.all([
        this.coursesService.findAll(),
        this.departmentsService.findAll(),
      ]);

      const instructors = new Set<string>();
      courses.forEach(course => {
        if (course.instructor) {
          instructors.add(`${course.instructor.firstName} ${course.instructor.lastName}`);
        }
      });

      return {
        departments: departments.map(d => ({ value: d.name, label: d.name })),
        instructors: Array.from(instructors).map(name => ({ value: name, label: name })),
        contentTypes: [
          { value: ContentType.COURSE, label: 'Courses' },
          { value: ContentType.DISCUSSION, label: 'Discussions' },
          { value: ContentType.ANNOUNCEMENT, label: 'Announcements' }
        ],
        difficulties: [
          { value: DifficultyLevel.BEGINNER, label: 'Beginner' },
          { value: DifficultyLevel.INTERMEDIATE, label: 'Intermediate' },
          { value: DifficultyLevel.ADVANCED, label: 'Advanced' }
        ]
      };
    } catch (error) {
      this.logger.error('Failed to get filter options:', error);
      return {
        departments: [],
        instructors: [],
        contentTypes: [],
        difficulties: []
      };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.meilisearch.health();
      return true;
    } catch (error) {
      this.logger.error('Meilisearch health check failed:', error);
      return false;
    }
  }
  // Real-time synchronization methods
  async indexCourse(courseId: number): Promise<void> {
    try {
      const course = await this.coursesService.findOne(courseId);
      if (!course) {
        this.logger.warn(`Course ${courseId} not found for indexing`);
        return;
      }

      const document = this.createCourseDocument(course);
      await this.contentIndex.addDocuments([document]);
      this.logger.log(`Indexed course ${courseId} in real-time`);
    } catch (error) {
      this.logger.error(`Failed to index course ${courseId}:`, error);
    }
  }
  async indexDiscussion(discussionId: number, courseId?: number): Promise<void> {
    try {
      // Use findDiscussionWithPosts if courseId is provided, otherwise find in all courses
      let discussion: any = null;

      if (courseId) {
        try {
          discussion = await this.discussionsService.findDiscussionWithPosts(courseId, discussionId);
        } catch (error) {
          this.logger.warn(`Discussion ${discussionId} not found in course ${courseId}`);
          return;
        }
      } else {
        // Find the discussion across all courses
        const courses = await this.coursesService.findAll();
        for (const course of courses) {
          try {
            discussion = await this.discussionsService.findDiscussionWithPosts(course.id, discussionId);
            courseId = course.id;
            break;
          } catch (error) {
            // Continue searching in other courses
          }
        }
      }

      if (!discussion) {
        this.logger.warn(`Discussion ${discussionId} not found for indexing`);
        return;
      }

      // Get course info if not already available
      let course: any = null;
      if (courseId) {
        course = await this.coursesService.findOne(courseId);
      }

      const document = {
        id: `discussion_${discussion.id}`,
        title: discussion.title,
        content: `${discussion.title} ${discussion.description || ''}`,
        type: 'discussion',
        instructor: discussion.creator ? `${discussion.creator.firstName} ${discussion.creator.lastName}` : '',
        instructorId: discussion.createdBy,
        department: course?.department?.name || '',
        departmentId: course?.departmentId,
        courseId: course?.id,
        courseTitle: course?.title || '',
        createdAt: discussion.createdAt.toISOString(),
        tags: [
          course?.department?.name,
          'discussion',
          discussion.creator ? `${discussion.creator.firstName} ${discussion.creator.lastName}` : ''
        ].filter(Boolean),
      };

      await this.contentIndex.addDocuments([document]);
      this.logger.log(`Indexed discussion ${discussionId} in real-time`);
    } catch (error) {
      this.logger.error(`Failed to index discussion ${discussionId}:`, error);
    }
  }
  // Module indexing methods
  async indexModule(moduleId: number, courseId?: number): Promise<void> {
    try {
      // For now, we'll update the parent course when a module is added/updated
      // This ensures the course content includes new modules
      if (courseId) {
        await this.updateCourseIndex(courseId);
        this.logger.log(`Updated course ${courseId} index after module ${moduleId} change`);
      }
    } catch (error) {
      this.logger.error(`Failed to update course index after module ${moduleId} change:`, error);
    }
  }

  async updateModuleIndex(moduleId: number, courseId?: number): Promise<void> {
    try {
      // Update the parent course when a module is updated
      if (courseId) {
        await this.updateCourseIndex(courseId);
        this.logger.log(`Updated module ${moduleId} in search index`);
      }
    } catch (error) {
      this.logger.error(`Failed to update module ${moduleId} in search index:`, error);
    }
  }

  async removeModuleFromIndex(moduleId: number, courseId?: number): Promise<void> {
    try {
      // Update the parent course when a module is removed
      if (courseId) {
        await this.updateCourseIndex(courseId);
        this.logger.log(`Updated course ${courseId} index after module ${moduleId} removal`);
      }
    } catch (error) {
      this.logger.error(`Failed to update course index after module ${moduleId} removal:`, error);
    }
  }
  // Lesson indexing methods
  async indexLesson(lessonId: number, moduleId?: number, courseId?: number): Promise<void> {
    try {
      // Update the parent course when a lesson is added/updated
      if (courseId) {
        await this.updateCourseIndex(courseId);
        this.logger.log(`Updated course ${courseId} index after lesson ${lessonId} change`);
      }
    } catch (error) {
      this.logger.error(`Failed to update course index after lesson ${lessonId} change:`, error);
    }
  }

  async updateLessonIndex(lessonId: number, moduleId?: number, courseId?: number): Promise<void> {
    try {
      // Update the parent course when a lesson is updated
      if (courseId) {
        await this.updateCourseIndex(courseId);
        this.logger.log(`Updated lesson ${lessonId} in search index`);
      }
    } catch (error) {
      this.logger.error(`Failed to update lesson ${lessonId} in search index:`, error);
    }
  }

  async removeLessonFromIndex(lessonId: number, moduleId?: number, courseId?: number): Promise<void> {
    try {
      // Update the parent course when a lesson is removed
      if (courseId) {
        await this.updateCourseIndex(courseId);
        this.logger.log(`Updated course ${courseId} index after lesson ${lessonId} removal`);
      }
    } catch (error) {
      this.logger.error(`Failed to update course index after lesson ${lessonId} removal:`, error);
    }
  }

  // Course synchronization methods
  async updateCourseIndex(courseId: number): Promise<void> {
    try {
      // Re-index the course to include any changes
      await this.indexCourse(courseId);
      this.logger.log(`Updated course ${courseId} in search index`);
    } catch (error) {
      this.logger.error(`Failed to update course ${courseId} in search index:`, error);
    }
  }

  async removeCourseFromIndex(courseId: number): Promise<void> {
    try {
      await this.contentIndex.deleteDocument(`course_${courseId}`);
      this.logger.log(`Removed course ${courseId} from search index`);
    } catch (error) {
      this.logger.error(`Failed to remove course ${courseId} from search index:`, error);
    }
  }

  // Discussion synchronization methods
  async updateDiscussionIndex(discussionId: number, courseId?: number): Promise<void> {
    try {
      // Re-index the discussion
      await this.indexDiscussion(discussionId, courseId);
      this.logger.log(`Updated discussion ${discussionId} in search index`);
    } catch (error) {
      this.logger.error(`Failed to update discussion ${discussionId} in search index:`, error);
    }
  }

  async removeDiscussionFromIndex(discussionId: number): Promise<void> {
    try {
      await this.contentIndex.deleteDocument(`discussion_${discussionId}`);
      this.logger.log(`Removed discussion ${discussionId} from search index`);
    } catch (error) {
      this.logger.error(`Failed to remove discussion ${discussionId} from search index:`, error);
    }
  }

  // Post synchronization methods
  async indexPost(postId: number, discussionId: number, courseId?: number): Promise<void> {
    try {
      // For now, we'll update the parent discussion when a post is added/updated
      // This ensures the discussion content includes new posts
      await this.updateDiscussionIndex(discussionId, courseId);
      this.logger.log(`Updated discussion ${discussionId} index after post ${postId} change`);
    } catch (error) {
      this.logger.error(`Failed to update discussion index after post ${postId} change:`, error);
    }
  }

  async removePostFromIndex(postId: number, discussionId: number, courseId?: number): Promise<void> {
    try {
      // Update the parent discussion when a post is removed
      await this.updateDiscussionIndex(discussionId, courseId);
      this.logger.log(`Updated discussion ${discussionId} index after post ${postId} removal`);
    } catch (error) {
      this.logger.error(`Failed to update discussion index after post ${postId} removal:`, error);
    }
  }
}