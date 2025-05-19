// recommendation-routes.js
const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendation-service');
const authenticateToken = require('../middleware/auth'); // middleware xác thực


router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Students only.' });
  }

  try {
    const studentId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    
    const recommendations = await recommendationService.getRecommendations(studentId, limit);
    
    if (recommendations.length > 0 && !recommendations[0].error) {
      const courseIds = recommendations.map(rec => rec.course_id);

      const [courses] = await pool.query(`
        SELECT c.*, 
               u.first_name, u.last_name, 
               d.name as department_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.id IN (?)
      `, [courseIds]);

      const enriched = recommendations.map(rec => {
        const course = courses.find(c => c.id === rec.course_id) || {};
        return {
          ...rec,
          courseDetails: {
            id: course.id,
            title: course.title || rec.title,
            description: course.description || rec.description,
            instructor: course.first_name && course.last_name ? 
              `${course.first_name} ${course.last_name}` : 'Unknown',
            department: course.department_name,
            thumbnail: course.thumbnail_url
          }
        };
      });

      res.json(enriched);
    } else {
      res.json(recommendations);
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
