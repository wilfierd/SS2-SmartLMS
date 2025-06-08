// Test script to manually trigger search indexing
require('dotenv').config();
const { MeiliSearch } = require('meilisearch');
const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lms_db'
};

const meilisearchConfig = {
    host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY
};

async function testSearchIndexing() {
    let dbConnection;

    try {
        console.log('🔗 Connecting to database...');
        dbConnection = await mysql.createConnection(dbConfig);
        console.log('✅ Database connected');

        console.log('🔗 Connecting to Meilisearch...');
        const meili = new MeiliSearch(meilisearchConfig);

        // Test connection
        const health = await meili.health();
        console.log('✅ Meilisearch connected:', health);

        console.log('📚 Fetching courses from database...');
        const [courses] = await dbConnection.query(`
      SELECT c.*, u.first_name, u.last_name, d.name as department_name 
      FROM courses c 
      LEFT JOIN users u ON c.instructor_id = u.id 
      LEFT JOIN departments d ON c.department_id = d.id
    `);
        console.log(`✅ Found ${courses.length} courses in database`);

        console.log('💬 Fetching discussions from database...');
        const [discussions] = await dbConnection.query(`
      SELECT d.*, c.title as course_title, u.first_name, u.last_name 
      FROM discussions d 
      LEFT JOIN courses c ON d.course_id = c.id 
      LEFT JOIN users u ON d.created_by = u.id
    `);
        console.log(`✅ Found ${discussions.length} discussions in database`);

        console.log('🔍 Creating search index...');
        const index = meili.index('lms_content');

        // Configure index
        await index.updateSearchableAttributes([
            'title',
            'content',
            'instructor',
            'department',
            'tags'
        ]);

        await index.updateFilterableAttributes([
            'type',
            'department',
            'instructor',
            'status',
            'difficulty',
            'instructorId',
            'departmentId'
        ]);

        console.log('✅ Index configured');

        console.log('📝 Preparing course documents...');
        const courseDocuments = courses.map(course => ({
            id: `course_${course.id}`,
            title: course.title,
            content: `${course.title} ${course.description || ''}`,
            type: 'course',
            instructor: course.first_name && course.last_name ? `${course.first_name} ${course.last_name}` : '',
            instructorId: course.instructor_id,
            department: course.department_name || '',
            departmentId: course.department_id,
            status: course.status,
            difficulty: 'intermediate',
            thumbnailUrl: course.thumbnail_url,
            createdAt: course.created_at ? new Date(course.created_at).toISOString() : new Date().toISOString(),
            tags: [
                course.department_name,
                course.first_name && course.last_name ? `${course.first_name} ${course.last_name}` : '',
                course.status
            ].filter(Boolean)
        }));

        console.log('📝 Preparing discussion documents...');
        const discussionDocuments = discussions.map(discussion => ({
            id: `discussion_${discussion.id}`,
            title: discussion.title,
            content: `${discussion.title} ${discussion.description || ''}`,
            type: 'discussion',
            instructor: discussion.first_name && discussion.last_name ? `${discussion.first_name} ${discussion.last_name}` : '',
            instructorId: discussion.created_by,
            department: '',
            departmentId: null,
            status: discussion.is_locked ? 'locked' : 'active',
            difficulty: 'beginner',
            courseTitle: discussion.course_title || '',
            courseId: discussion.course_id,
            createdAt: discussion.created_at ? new Date(discussion.created_at).toISOString() : new Date().toISOString(),
            tags: [
                discussion.course_title,
                'discussion'
            ].filter(Boolean)
        }));

        const allDocuments = [...courseDocuments, ...discussionDocuments];
        console.log(`📤 Indexing ${allDocuments.length} documents to Meilisearch...`);

        const indexingResult = await index.addDocuments(allDocuments);
        console.log('✅ Documents sent to Meilisearch. Task ID:', indexingResult.taskUid);

        // Wait a bit for indexing to complete
        console.log('⏳ Waiting for indexing to complete...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if documents were indexed
        const stats = await index.getStats();
        console.log('📊 Index stats:', stats);

        // Test search
        console.log('🔍 Testing search functionality...');
        const searchResult = await index.search('programming');
        console.log(`✅ Search test: Found ${searchResult.hits.length} results for "programming"`);

        if (searchResult.hits.length > 0) {
            console.log('📋 Sample result:', searchResult.hits[0]);
        }

        console.log('\n🎉 Search indexing completed successfully!');
        console.log('✅ The search functionality should now work properly.');

    } catch (error) {
        console.error('❌ Error during search indexing:', error);
    } finally {
        if (dbConnection) {
            await dbConnection.end();
        }
    }
}

testSearchIndexing();
