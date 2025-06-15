import mysql.connector
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', 'zzzNszzz19'),
        database=os.getenv('DB_NAME', 'lms_db')
    )

def extract_data():
    conn = get_db_connection()
    
    # Extract users (students)
    students_query = """
    SELECT id, email, first_name, last_name, created_at
    FROM users 
    WHERE role = 'student'
    """
    students_df = pd.read_sql(students_query, conn)
    
    # Extract courses with department and instructor info
    courses_query = """
    SELECT 
        c.id, c.title, c.description, c.instructor_id, c.department_id,
        c.status, c.is_featured, c.created_at,
        d.name as department_name,
        CONCAT(u.first_name, ' ', u.last_name) as instructor_name
    FROM courses c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN users u ON c.instructor_id = u.id
    WHERE c.status = 'published'
    """
    courses_df = pd.read_sql(courses_query, conn)
    
    # Extract enrollments
    enrollments_query = """
    SELECT student_id, course_id, enrollment_date, completion_status, completion_date
    FROM enrollments
    """
    enrollments_df = pd.read_sql(enrollments_query, conn)
    
    # Extract submissions (for performance analysis)
    submissions_query = """
    SELECT 
        s.student_id, a.course_id, s.grade, s.submission_date,
        s.is_graded
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE s.is_graded = TRUE AND s.grade IS NOT NULL
    """
    submissions_df = pd.read_sql(submissions_query, conn)
    
    conn.close()
    
    # Save to CSV
    os.makedirs('data', exist_ok=True)
    students_df.to_csv('data/students.csv', index=False)
    courses_df.to_csv('data/courses.csv', index=False)
    enrollments_df.to_csv('data/enrollments.csv', index=False)
    submissions_df.to_csv('data/submissions.csv', index=False)
    
    print("Data extracted successfully!")
    print(f"Students: {len(students_df)}")
    print(f"Courses: {len(courses_df)}")
    print(f"Enrollments: {len(enrollments_df)}")
    print(f"Submissions: {len(submissions_df)}")

if __name__ == "__main__":
    extract_data()