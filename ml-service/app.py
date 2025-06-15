from flask import Flask, jsonify, request
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
from datetime import datetime
import logging
import random
import os
from recommender_utils import hybrid_recommendations

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables for model components
course_features = None
tfidf = None
user_course_matrix = None
courses_df = None
students_df = None
hybrid_recommendations_func = None
model_loaded = False

# Load model and data
def load_model():
    global course_features, tfidf, user_course_matrix, courses_df, students_df
    global hybrid_recommendations_func, model_loaded
    
    try:
        pkl_file = 'recommendation_model.pkl'
        
        if not os.path.exists(pkl_file):
            logger.error(f"Model file {pkl_file} not found!")
            return False
            
        logger.info(f"Loading model from {pkl_file}...")
        
        with open(pkl_file, 'rb') as f:
            models = pickle.load(f)
        
        # Extract components
        course_features = models.get('course_features')
        tfidf = models.get('tfidf')
        user_course_matrix = models.get('user_course_matrix')
        courses_df = models.get('courses_df')
        students_df = models.get('students_df')
        hybrid_recommendations_func = models.get('hybrid_recommendations')
        
        # Verify all components loaded
        if all([
            course_features is not None,
            courses_df is not None,
            students_df is not None,
            hybrid_recommendations_func is not None
        ]):
            model_loaded = True
            logger.info("✅ Model loaded successfully!")
            logger.info(f"📊 Loaded {len(courses_df)} courses and {len(students_df)} students")
            return True
        else:
            logger.error("❌ Some model components are missing!")
            return False
            
    except FileNotFoundError:
        logger.error(f"❌ Model file {pkl_file} not found!")
        return False
    except Exception as e:
        logger.error(f"❌ Error loading model: {e}")
        return False

# Initialize model on startup
load_model()

# Fallback data if model fails to load
FALLBACK_COURSES = [
    {
        'id': 1,
        'title': 'Introduction to Python Programming',
        'description': 'Learn the basics of Python programming language',
        'department_name': 'Computer Science',
        'instructor_name': 'Dr. Smith',
        'difficulty_level': 'Beginner'
    },
    {
        'id': 2,
        'title': 'Data Structures and Algorithms',
        'description': 'Fundamental data structures and algorithms',
        'department_name': 'Computer Science', 
        'instructor_name': 'Dr. Johnson',
        'difficulty_level': 'Intermediate'
    },
    {
        'id': 3,
        'title': 'Web Development Fundamentals',
        'description': 'HTML, CSS, JavaScript basics',
        'department_name': 'Computer Science',
        'instructor_name': 'Prof. Wilson',
        'difficulty_level': 'Beginner'
    }
]

def format_recommendation(course_id):
    """Format course recommendation with details from loaded data"""
    if not model_loaded or courses_df is None:
        return None
    
    try:
        course = courses_df[courses_df['id'] == course_id]
        if course.empty:
            logger.warning(f"Course {course_id} not found in courses_df")
            return None
        
        course = course.iloc[0]
        return {
            'course_id': int(course_id),
            'title': course.get('title', 'Unknown Course'),
            'description': course.get('description', 'No description available') if pd.notna(course.get('description')) else 'No description available',
            'department_name': course.get('department_name', 'General') if pd.notna(course.get('department_name')) else 'General',
            'instructor_name': course.get('instructor_name', 'TBD') if pd.notna(course.get('instructor_name')) else 'TBD',
            'credits': int(course.get('credits', 3)) if pd.notna(course.get('credits')) else 3,
            'difficulty_level': course.get('difficulty_level', 'Intermediate') if pd.notna(course.get('difficulty_level')) else 'Intermediate',
            'score': round(random.uniform(0.75, 0.95), 2),  # Mock confidence score
            'strategies': ['Personalized Learning', 'AI-Recommended'],
            'reason': 'Recommended based on your learning patterns and course similarities'
        }
    except Exception as e:
        logger.error(f"Error formatting recommendation for course {course_id}: {e}")
        return None

def get_recommendations_for_student(student_id, limit=3):
    """Get recommendations using loaded model or fallback"""
    recommendations = []
    
    if model_loaded and hybrid_recommendations_func is not None:
        try:
            # Check if student exists
            if students_df is not None and student_id not in students_df['id'].values:
                logger.warning(f"Student {student_id} not found, using popular courses")
                # Get popular courses as fallback
                popular_course_ids = courses_df['id'].head(limit).tolist()
            else:
                # Use the hybrid recommendation function
                logger.info(f"Getting ML recommendations for student {student_id}")
                popular_course_ids = hybrid_recommendations_func(student_id, limit)
            
            # Format recommendations
            for course_id in popular_course_ids:
                formatted_rec = format_recommendation(course_id)
                if formatted_rec:
                    recommendations.append(formatted_rec)
                    
        except Exception as e:
            logger.error(f"Error getting ML recommendations: {e}")
            recommendations = get_fallback_recommendations(limit)
    else:
        logger.warning("Model not loaded, using fallback recommendations")
        recommendations = get_fallback_recommendations(limit)
    
    return recommendations

def get_fallback_recommendations(limit=3):
    """Generate fallback recommendations when model is not available"""
    available_courses = FALLBACK_COURSES.copy()
    random.shuffle(available_courses)
    
    recommendations = []
    for course in available_courses[:limit]:
        recommendation = {
            'course_id': course['id'],
            'title': course['title'],
            'description': course['description'],
            'department_name': course['department_name'],
            'instructor_name': course['instructor_name'],
            'credits': 3,
            'difficulty_level': course['difficulty_level'],
            'score': round(random.uniform(0.7, 0.85), 2),
            'strategies': ['General Recommendation'],
            'reason': 'Popular course recommendation (model not available)'
        }
        recommendations.append(recommendation)
    
    return recommendations

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ml-recommendation-service',
        'model_loaded': model_loaded,
        'timestamp': datetime.now().isoformat(),
        'message': 'Recommendation service is running',
        'data_info': {
            'courses_count': len(courses_df) if courses_df is not None else 0,
            'students_count': len(students_df) if students_df is not None else 0
        }
    })

@app.route('/api/recommendations', methods=['GET'])
def get_current_user_recommendations():
    """Get recommendations for current user - matches frontend call"""
    try:
        # Get query parameters
        limit = request.args.get('limit', 3, type=int)
        student_id = request.args.get('student_id', 1, type=int)  # Default student for testing
        
        logger.info(f"Getting recommendations for student {student_id} with limit: {limit}")
        
        # Get recommendations using loaded model or fallback
        recommendations = get_recommendations_for_student(student_id, limit)
        
        response = {
            'success': True,
            'recommendations': recommendations,
            'total': len(recommendations),
            'student_id': student_id,
            'model_status': 'loaded' if model_loaded else 'fallback',
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': [],
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/recommendations/<int:student_id>', methods=['GET'])
def get_student_recommendations(student_id):
    """Get recommendations for a specific student"""
    try:
        # Get query parameters
        limit = request.args.get('limit', 3, type=int)
        
        logger.info(f"Getting recommendations for student {student_id}, limit: {limit}")
        
        # Get recommendations
        recommendations = get_recommendations_for_student(student_id, limit)
        
        return jsonify({
            'success': True,
            'student_id': student_id,
            'recommendations': recommendations,
            'model_status': 'loaded' if model_loaded else 'fallback',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations for student {student_id}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'student_id': student_id,
            'recommendations': [],
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/recommendations/batch', methods=['POST'])
def get_batch_recommendations():
    """Get recommendations for multiple students"""
    try:
        data = request.get_json()
        student_ids = data.get('student_ids', [])
        limit = data.get('limit', 3)
        
        logger.info(f"Getting batch recommendations for {len(student_ids)} students")
        
        results = {}
        for student_id in student_ids:
            try:
                recommendations = get_recommendations_for_student(student_id, limit)
                results[student_id] = recommendations
            except Exception as e:
                logger.error(f"Error getting recommendations for student {student_id}: {e}")
                results[student_id] = get_fallback_recommendations(limit)
        
        return jsonify({'results': results})
        
    except Exception as e:
        logger.error(f"Error in batch recommendations: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/model/retrain', methods=['POST'])
def retrain_model():
    """Reload the model from pkl file"""
    try:
        logger.info("Model reload requested")
        success = load_model()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Model reloaded successfully',
                'model_loaded': model_loaded,
                'courses_count': len(courses_df) if courses_df is not None else 0,
                'students_count': len(students_df) if students_df is not None else 0
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to reload model',
                'model_loaded': model_loaded
            }), 500
    except Exception as e:
        logger.error(f"Error reloading model: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    """Mock cache clearing"""
    try:
        logger.info("Mock cache clear requested")
        return jsonify({
            'success': True,
            'message': 'Mock cache cleared successfully'
        })
    except Exception as e:
        logger.error(f"Error clearing mock cache: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get service statistics"""
    try:
        if model_loaded:
            stats = {
                'total_students': len(students_df) if students_df is not None else 0,
                'total_courses': len(courses_df) if courses_df is not None else 0,
                'total_interactions': len(user_course_matrix.values.nonzero()[0]) if user_course_matrix is not None else 0,
                'model_status': 'loaded',
                'last_updated': datetime.now().isoformat(),
                'model_components': {
                    'course_features': course_features is not None,
                    'tfidf': tfidf is not None,
                    'user_course_matrix': user_course_matrix is not None,
                    'courses_df': courses_df is not None,
                    'students_df': students_df is not None,
                    'hybrid_recommendations_func': hybrid_recommendations_func is not None
                }
            }
        else:
            stats = {
                'total_students': 0,
                'total_courses': len(FALLBACK_COURSES),
                'total_interactions': 0,
                'model_status': 'not_loaded',
                'last_updated': datetime.now().isoformat(),
                'message': 'Using fallback recommendations'
            }
        
        return jsonify({'stats': stats})
        
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'timestamp': datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'timestamp': datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    print("="*60)
    print("🚀 Starting Course Recommendation Service")
    print("="*60)
    
    if model_loaded:
        print("✅ Model Status: LOADED")
        print(f"📊 Courses: {len(courses_df)}")
        print(f"👥 Students: {len(students_df)}")
    else:
        print("⚠️  Model Status: NOT LOADED (using fallback)")
        print("📝 Make sure 'recommendation_model.pkl' exists in the current directory")
    
    print("="*60)
    print("🌐 Available Endpoints:")
    print("✅ Health check: http://localhost:8000/health")
    print("✅ Recommendations: http://localhost:8000/api/recommendations?limit=3")
    print("✅ Student specific: http://localhost:8000/recommendations/1?limit=3")
    print("✅ Statistics: http://localhost:8000/stats")
    print("="*60)
    
    app.run(host='0.0.0.0', port=8000, debug=True)