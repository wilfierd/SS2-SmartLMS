// backend/routes/recommendation-routes.js
const express = require('express');
const router = express.Router();
const recommendationService = require('../services/recommendation-service');

// Route để lấy gợi ý khóa học cho sinh viên hiện tại
router.get('/', async (req, res) => {
  // Kiểm tra quyền - chỉ sinh viên mới được phép sử dụng tính năng này
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Students only.' });
  }

  try {
    const studentId = req.user.id;
    const limit = parseInt(req.query.limit) || 3;
    
    // Gọi service để lấy gợi ý
    const recommendations = await recommendationService.getRecommendations(studentId, limit);
    
    // Nếu có gợi ý và không có lỗi, lấy thêm thông tin chi tiết về khóa học
    if (recommendations.length > 0 && !recommendations[0].error) {
      const courseIds = recommendations.map(rec => rec.course_id);

      // Sử dụng pool từ request object (được truyền vào từ middleware)
      const [courses] = await req.pool.query(`
        SELECT c.*, 
               u.first_name, u.last_name, 
               d.name as department_name
        FROM courses c
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.id IN (?)
      `, [courseIds]);

      // Kết hợp dữ liệu gợi ý với thông tin chi tiết khóa học
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