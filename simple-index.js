const { MeiliSearch } = require('meilisearch');
const mysql = require('mysql2/promise');

async function indexData() {
    try {
        console.log('🔗 Connecting to MySQL...');
        const db = await mysql.createConnection({
            host: 'localhost',
            port: 3307,
            user: 'lms_user',
            password: 'your_secure_mysql_password_here',
            database: 'lms_db'
        });

        console.log('🔗 Connecting to Meilisearch...');
        const meili = new MeiliSearch({
            host: 'http://localhost:7700',
            apiKey: 'lms_search_master_key_2024_secure'
        });

        console.log('📊 Fetching courses...');
        const [courses] = await db.execute(`
            SELECT c.id, c.title, c.description, c.code, d.name as department_name 
            FROM courses c 
            LEFT JOIN departments d ON c.department_id = d.id
        `);

        console.log('📊 Fetching discussions...');
        const [discussions] = await db.execute(`
            SELECT d.id, d.title, d.description, c.title as course_title 
            FROM discussions d 
            LEFT JOIN courses c ON d.course_id = c.id
        `);

        console.log(`Found ${courses.length} courses and ${discussions.length} discussions`);

        // Prepare documents
        const documents = [];
        
        courses.forEach(course => {
            documents.push({
                id: `course_${course.id}`,
                type: 'course',
                title: course.title,
                description: course.description || '',
                content: `${course.title} ${course.description || ''} ${course.code} ${course.department_name || ''}`,
                course_code: course.code,
                department: course.department_name
            });
        });

        discussions.forEach(discussion => {
            documents.push({
                id: `discussion_${discussion.id}`,
                type: 'discussion',
                title: discussion.title,
                description: discussion.description || '',
                content: `${discussion.title} ${discussion.description || ''} ${discussion.course_title || ''}`,
                course_title: discussion.course_title
            });
        });

        console.log(`📝 Indexing ${documents.length} documents...`);
        const index = meili.index('lms_content');
        
        // Delete existing documents first
        await index.deleteAllDocuments();
        console.log('🗑️ Cleared existing documents');
        
        // Add new documents
        const result = await index.addDocuments(documents);
        console.log(`✅ Indexing started. Task ID: ${result.taskUid}`);

        // Wait for indexing to complete
        await index.waitForTask(result.taskUid);
        
        const stats = await index.getStats();
        console.log(`🎉 Indexing complete! Documents in index: ${stats.numberOfDocuments}`);

        await db.end();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

indexData();
