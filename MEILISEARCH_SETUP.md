# Meilisearch Setup Guide

This guide will help you set up and run the Meilisearch search functionality in your LMS system.

## Prerequisites

- Docker and Docker Compose installed
- Node.js environment for the backend
- Existing LMS system running

## Installation Steps

### 1. Install Dependencies

Run the following command in the `nestjs-backend` directory:

```bash
cd nestjs-backend
npm install meilisearch@^0.37.0
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Meilisearch Configuration
MEILISEARCH_MASTER_KEY=your_secure_master_key_here_min_16_chars
MEILISEARCH_ENV=production
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_API_KEY=your_secure_master_key_here_min_16_chars
```

**Important**: 
- Use the same value for `MEILISEARCH_MASTER_KEY` and `MEILISEARCH_API_KEY`
- The master key must be at least 16 characters long
- For development, you can use: `your_dev_key_1234567890`

### 3. Start the Services

Run the following command to start all services including Meilisearch:

```bash
docker-compose up -d
```

This will:
- Start the Meilisearch service on port 7700
- Start your existing backend with search functionality
- Automatically index existing content after 5 seconds

### 4. Verify Setup

Check that Meilisearch is running:

```bash
# Check service health
curl http://localhost:7700/health

# Check the search endpoint
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/search/health
```

## Usage

### Frontend Integration

The search functionality is now integrated into the header of your application. Users can:

1. **Search Content**: Type in the search bar to find courses, discussions, and announcements
2. **Use Filters**: Click the filter button to narrow results by:
   - Content type (courses, discussions, announcements)
   - Department
   - Instructor
   - Difficulty level
3. **Navigate Results**: Click on search results to navigate directly to the content

### API Endpoints

#### Search Content
```http
GET /api/search?q=javascript&type=course&department=Computer Science
```

#### Get Filter Options
```http
GET /api/search/filters
```

#### Reindex Content (Admin only)
```http
POST /api/search/reindex
```

## Search Features

### Content Types Indexed
- **Courses**: Title, description, instructor, department
- **Discussions**: Title, description, creator, course department
- **Announcements**: (Ready for future implementation)

### Search Capabilities
- **Full-text search** with typo tolerance
- **Highlighted results** showing matched terms
- **Faceted filtering** by multiple criteria
- **Real-time suggestions** as you type
- **Fast performance** with sub-millisecond response times

### Filters Available
- **Department**: Filter by academic department
- **Instructor**: Filter by course instructor
- **Content Type**: Courses, discussions, announcements
- **Difficulty**: Beginner, intermediate, advanced
- **Status**: Active, archived, etc.

## Maintenance

### Reindexing Content

The system automatically indexes new content, but you may need to reindex manually:

```bash
# Via API
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/search/reindex

# Or through the admin interface (coming soon)
```

### Monitoring

Monitor Meilisearch health and performance:

```bash
# Check Meilisearch status
docker logs lms-meilisearch

# Check backend search logs
docker logs lms-nestjs-backend | grep SearchService
```

## Troubleshooting

### Common Issues

1. **Search not working**:
   - Check that Meilisearch container is running: `docker ps | grep meilisearch`
   - Verify environment variables are set correctly
   - Check backend logs for indexing errors

2. **No search results**:
   - Wait for initial indexing to complete (check logs)
   - Manually trigger reindexing via API
   - Verify content exists in database

3. **Performance issues**:
   - Check Meilisearch memory usage
   - Consider increasing Docker memory limits
   - Monitor index size and optimize if needed

### Development Tips

- Use `MEILISEARCH_ENV=development` for detailed logging
- Access Meilisearch dashboard at `http://localhost:7700` (if enabled)
- Test search queries directly in Meilisearch interface

## Customization

### Adding New Content Types

To index additional content types:

1. Update the `SearchService.indexAllContent()` method
2. Add new indexing methods (e.g., `indexAnnouncements()`)
3. Update the `ContentType` enum in DTOs
4. Add navigation handling in `Header.js`

### Modifying Search Attributes

To change what fields are searchable:

1. Update `updateSearchableAttributes()` in `SearchService`
2. Modify document structure in indexing methods
3. Reindex content to apply changes

## Security Notes

- The Meilisearch master key provides full access to the search engine
- All search endpoints require JWT authentication
- Search results respect user permissions (future enhancement)
- Consider implementing role-based search filtering for sensitive content 