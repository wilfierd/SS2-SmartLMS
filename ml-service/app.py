"""
Real-time ML Recommendation Microservice
Replaces the Jupyter notebook approach with live database queries and Redis caching
"""
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

from flask import Flask, request, jsonify
from flask_cors import CORS
import redis
import json
import os
import logging
from datetime import datetime, timedelta
from recommendation_engine import RecommendationEngine
from database import DatabaseManager

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis (with fallback for development)
try:
    redis_client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        decode_responses=True
    )
    redis_client.ping()
    logger.info("Redis connected successfully")
except:
    logger.warning("Redis not available, running without cache")
    redis_client = None

# Initialize database and recommendation engine
db_manager = DatabaseManager()
recommendation_engine = RecommendationEngine(db_manager, redis_client)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'redis_available': redis_client is not None,
        'database_available': db_manager.test_connection()
    })

@app.route('/recommendations/<int:student_id>', methods=['GET'])
def get_recommendations(student_id):
    """Get course recommendations for a student"""
    try:
        # Get parameters
        limit = request.args.get('limit', 3, type=int)
        force_refresh = request.args.get('refresh', False, type=bool)
        
        logger.info(f"Getting recommendations for student {student_id}, limit: {limit}")
        
        # Get recommendations
        recommendations = recommendation_engine.get_recommendations(
            student_id=student_id,
            limit=limit,
            force_refresh=force_refresh
        )
        
        return jsonify({
            'success': True,
            'student_id': student_id,
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations for student {student_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'student_id': student_id
        }), 500

@app.route('/recommendations/batch', methods=['POST'])
def get_batch_recommendations():
    """Get recommendations for multiple students"""
    try:
        data = request.get_json()
        student_ids = data.get('student_ids', [])
        limit = data.get('limit', 3)
        
        if not student_ids:
            return jsonify({
                'success': False,
                'error': 'student_ids array is required'
            }), 400
        
        logger.info(f"Getting batch recommendations for {len(student_ids)} students")
        
        results = {}
        for student_id in student_ids:
            try:
                recommendations = recommendation_engine.get_recommendations(
                    student_id=student_id,
                    limit=limit
                )
                results[student_id] = recommendations
            except Exception as e:
                logger.error(f"Error getting recommendations for student {student_id}: {str(e)}")
                results[student_id] = {'error': str(e)}
        
        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in batch recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/model/retrain', methods=['POST'])
def retrain_model():
    """Trigger model retraining (admin only)"""
    try:
        logger.info("Starting model retraining")
        
        # Clear cache
        if redis_client:
            recommendation_engine.clear_cache()
        
        # Rebuild similarity matrices
        recommendation_engine.rebuild_similarity_matrix()
        
        return jsonify({
            'success': True,
            'message': 'Model retrained successfully',
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error retraining model: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/cache/clear', methods=['POST'])
def clear_cache():
    """Clear recommendation cache (admin only)"""
    try:
        if redis_client:
            recommendation_engine.clear_cache()
            return jsonify({
                'success': True,
                'message': 'Cache cleared successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Redis not available'
            }), 503
            
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get recommendation service statistics"""
    try:
        stats = recommendation_engine.get_stats()
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Development server
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 8000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
