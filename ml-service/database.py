"""
Database Manager for ML Recommendation Service
Handles real-time database queries replacing static pickle models
"""
import pymysql
import pandas as pd
import os
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': int(os.getenv('DB_PORT', '3306')),
            'user': os.getenv('DB_USER', ''),
            'password': os.getenv('DB_PASSWORD', ''),
            'database': os.getenv('DB_NAME', 'lms_db'),
            'charset': 'utf8mb4',
            'cursorclass': pymysql.cursors.DictCursor
        }
        
    def get_connection(self):
        """Get a database connection"""
        return pymysql.connect(**self.db_config)
    
    def test_connection(self) -> bool:
        """Test database connectivity"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    return True
        except Exception as e:
            logger.error(f"Database connection test failed: {str(e)}")
            return False
    
    def execute_query(self, query: str, params: tuple = None) -> pd.DataFrame:
        """Execute a query and return results as DataFrame"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    results = cursor.fetchall()
                    return pd.DataFrame(results)
        except Exception as e:
            logger.error(f"Query execution failed: {str(e)}")
            raise
    
    def get_student_enrollments(self, student_id: Optional[int] = None) -> pd.DataFrame:
        """Get enrollment data for all students or a specific student"""
        query = """
        SELECT 
            e.student_id,
            e.course_id,
            e.completion_status,
            e.progress,
            e.enrollment_date,
            c.title as course_title,
            c.department_id,
            d.name as department_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        """
        
        params = None
        if student_id:
            query += " WHERE e.student_id = %s"
            params = (student_id,)
            
        query += " ORDER BY e.student_id, e.enrollment_date"
        
        return self.execute_query(query, params)
    
    def get_all_courses(self) -> pd.DataFrame:
        """Get all course information"""
        query = """
        SELECT 
            c.id,
            c.title,
            c.description,
            c.instructor_id,
            c.department_id,
            c.credits,
            c.difficulty_level,
            c.estimated_duration,
            d.name as department_name,
            u.name as instructor_name
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN users u ON c.instructor_id = u.id
        WHERE c.status = 'active'
        ORDER BY c.id
        """
        
        return self.execute_query(query)
    
    def get_student_info(self, student_id: int) -> Dict:
        """Get detailed student information"""
        query = """
        SELECT 
            u.id,
            u.name,
            u.email,
            u.department_id,
            d.name as department_name,
            COUNT(e.id) as total_enrollments,
            AVG(CASE 
                WHEN e.completion_status = 'completed' THEN e.progress 
                ELSE NULL 
            END) as avg_completion_rate
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN enrollments e ON u.id = e.student_id
        WHERE u.id = %s AND u.role = 'student'
        GROUP BY u.id, u.name, u.email, u.department_id, d.name
        """
        
        result = self.execute_query(query, (student_id,))
        return result.iloc[0].to_dict() if len(result) > 0 else None
    
    def get_course_statistics(self) -> pd.DataFrame:
        """Get course enrollment and completion statistics"""
        query = """
        SELECT 
            c.id as course_id,
            c.title,
            c.department_id,
            COUNT(e.id) as total_enrollments,
            COUNT(CASE WHEN e.completion_status = 'completed' THEN 1 END) as completions,
            COUNT(CASE WHEN e.completion_status = 'in_progress' THEN 1 END) as in_progress,
            AVG(e.progress) as avg_progress,
            ROUND(COUNT(CASE WHEN e.completion_status = 'completed' THEN 1 END) * 100.0 / COUNT(e.id), 2) as completion_rate
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id
        WHERE c.status = 'active'
        GROUP BY c.id, c.title, c.department_id
        HAVING total_enrollments > 0
        ORDER BY total_enrollments DESC
        """
        
        return self.execute_query(query)
    
    def get_user_course_matrix(self) -> pd.DataFrame:
        """Generate user-course interaction matrix with real-time data"""
        enrollments_df = self.get_student_enrollments()
        
        if enrollments_df.empty:
            logger.warning("No enrollment data found")
            return pd.DataFrame()
        
        # Map completion status to numerical values
        status_map = {
            'completed': 1.0,
            'in_progress': 0.6,
            'not_started': 0.2
        }
        
        # Add interaction strength based on completion status and progress
        enrollments_df['interaction_strength'] = enrollments_df.apply(
            lambda row: status_map.get(row['completion_status'], 0.1) * (row.get('progress', 0) / 100.0 + 0.1),
            axis=1
        )
        
        # Create pivot table
        user_course_matrix = enrollments_df.pivot_table(
            index='student_id',
            columns='course_id',
            values='interaction_strength',
            fill_value=0,
            aggfunc='max'  # Take maximum interaction strength if multiple enrollments
        )
        
        return user_course_matrix
    
    def get_similar_students(self, student_id: int, limit: int = 10) -> List[int]:
        """Find students with similar enrollment patterns"""
        query = """
        SELECT DISTINCT e2.student_id, COUNT(*) as common_courses
        FROM enrollments e1
        JOIN enrollments e2 ON e1.course_id = e2.course_id 
                              AND e1.student_id != e2.student_id
        WHERE e1.student_id = %s
        GROUP BY e2.student_id
        HAVING common_courses >= 2
        ORDER BY common_courses DESC
        LIMIT %s
        """
        
        result = self.execute_query(query, (student_id, limit))
        return result['student_id'].tolist() if not result.empty else []
    
    def get_popular_courses_by_department(self, department_id: int, limit: int = 5) -> List[int]:
        """Get most popular courses in a department"""
        query = """
        SELECT c.id, COUNT(e.id) as enrollment_count
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        WHERE c.department_id = %s AND c.status = 'active'
        GROUP BY c.id
        ORDER BY enrollment_count DESC
        LIMIT %s
        """
        
        result = self.execute_query(query, (department_id, limit))
        return result['id'].tolist() if not result.empty else []
    
    def get_trending_courses(self, days: int = 30, limit: int = 10) -> List[int]:
        """Get courses with recent high enrollment activity"""
        query = """
        SELECT e.course_id, COUNT(*) as recent_enrollments
        FROM enrollments e
        WHERE e.enrollment_date >= DATE_SUB(NOW(), INTERVAL %s DAY)
        GROUP BY e.course_id
        ORDER BY recent_enrollments DESC
        LIMIT %s
        """
        
        result = self.execute_query(query, (days, limit))
        return result['course_id'].tolist() if not result.empty else []
