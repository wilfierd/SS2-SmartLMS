"""
Flask API server for Course Recommendation System
Serves real-time recommendations and handles automatic model retraining
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from threading import Thread
import time
import traceback
from typing import Dict, List, Optional

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.exceptions import BadRequest, InternalServerError
import schedule
import atexit

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import API_CONFIG, TRAINING_CONFIG, REFRESH_CONFIG, LOGGING_CONFIG
from core import DatabaseManager, HybridRecommender, IncrementalRecommender
from evaluation import ModelEvaluator

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOGGING_CONFIG['level']),
    format=LOGGING_CONFIG['format'],
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global variables
db_manager = None
recommender = None
incremental_recommender = None
scheduler_thread = None
shutdown_flag = False

def initialize_system():
    """Initialize the recommendation system"""
    global db_manager, recommender, incremental_recommender
    
    try:
        logger.info("Initializing recommendation system...")
        
        # Create necessary directories
        os.makedirs("logs", exist_ok=True)
        os.makedirs("ml", exist_ok=True)
        
        # Initialize database manager
        db_manager = DatabaseManager()
        
        # Load or create model
        model_path = TRAINING_CONFIG['model_path']
        
        if os.path.exists(model_path):
            logger.info(f"Loading existing model from {model_path}")
            recommender = HybridRecommender.load_model(model_path, db_manager)
            
            if recommender is None:
                logger.warning("Failed to load existing model, creating new one")
                recommender = HybridRecommender(db_manager)
                train_model()
        else:
            logger.info("No existing model found, creating new one")
            recommender = HybridRecommender(db_manager)
            train_model()
        
        # Initialize incremental recommender
        incremental_recommender = IncrementalRecommender(recommender)
        
        logger.info("System initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize system: {e}")
        logger.error(traceback.format_exc())
        return False

def train_model():
    """Train the recommendation model"""
    global recommender
    
    try:
        logger.info("Starting model training...")
        
        if recommender is None:
            logger.error("Recommender not initialized")
            return False
        
        # Train the model
        recommender.train()
        
        # Save the trained model
        model_path = TRAINING_CONFIG['model_path']
        backup_path = TRAINING_CONFIG['backup_model_path']
        
        # Create backup of existing model
        if os.path.exists(model_path):
            try:
                os.rename(model_path, backup_path)
                logger.info(f"Backed up existing model to {backup_path}")
            except Exception as e:
                logger.warning(f"Failed to backup model: {e}")
        
        # Save new model
        recommender.save_model(model_path)
        
        logger.info("Model training completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Model training failed: {e}")
        logger.error(traceback.format_exc())
        return False

def run_evaluation():
    """Run model evaluation and log results"""
    try:
        logger.info("Running model evaluation...")
        
        evaluator = ModelEvaluator(recommender, db_manager)
        report = evaluator.generate_evaluation_report()
        
        # Save evaluation report
        eval_file = f"logs/evaluation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(eval_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        # Log key metrics
        if report.get('model_performance'):
            perf = report['model_performance']
            logger.info(f"Model Performance - Precision@5: {perf.get('precision@5', 0):.4f}, "
                       f"Recall@5: {perf.get('recall@5', 0):.4f}")
        
        logger.info(f"Evaluation report saved to {eval_file}")
        
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")

def scheduled_training():
    """Scheduled training function to be run daily"""
    logger.info("Starting scheduled model training...")
    
    try:
        # Train model
        if train_model():
            # Run evaluation after training
            run_evaluation()
            logger.info("Scheduled training completed successfully")
        else:
            logger.error("Scheduled training failed")
            
    except Exception as e:
        logger.error(f"Scheduled training error: {e}")
        logger.error(traceback.format_exc())

def setup_scheduler():
    """Setup the training scheduler"""
    global scheduler_thread, shutdown_flag
    
    # Schedule daily training at 2 AM
    schedule.every().day.at("02:00").do(scheduled_training)
    
    def run_scheduler():
        while not shutdown_flag:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    scheduler_thread = Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()
    logger.info("Training scheduler started - will run daily at 2:00 AM")

def cleanup_on_exit():
    """Cleanup function to be called on exit"""
    global shutdown_flag, db_manager
    
    logger.info("Shutting down recommendation system...")
    shutdown_flag = True
    
    if db_manager:
        db_manager.close()
    
    logger.info("System shutdown complete")

# Register cleanup function
atexit.register(cleanup_on_exit)

@app.before_request
def before_request():
    """Initialize request context"""
    g.start_time = time.time()

@app.after_request
def after_request(response):
    """Log request completion"""
    duration = time.time() - g.start_time
    logger.info(f"{request.method} {request.path} - {response.status_code} - {duration:.3f}s")
    return response

@app.errorhandler(400)
def bad_request(error):
    return jsonify({
        'error': 'Bad Request',
        'message': str(error.description),
        'timestamp': datetime.now().isoformat()
    }), 400

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred',
        'timestamp': datetime.now().isoformat()
    }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check database connection
        db_manager.ensure_connection()
        
        # Check model status
        model_status = "loaded" if recommender and recommender.is_trained else "not_loaded"
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'database': 'connected',
            'model': model_status
        })
    
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }), 500

@app.route('/recommendations/<int:user_id>', methods=['GET'])
def get_recommendations(user_id):
    """Get recommendations for a specific user"""
    try:
        # Validate user_id
        if user_id <= 0:
            raise BadRequest("Invalid user_id")
        
        # Get optional parameters
        n_recommendations = request.args.get('n_recommendations', 5, type=int)
        if n_recommendations <= 0 or n_recommendations > 20:
            raise BadRequest("n_recommendations must be between 1 and 20")
        
        # Check if model is ready
        if not recommender or not recommender.is_trained:
            return jsonify({
                'error': 'Model not ready',
                'message': 'Recommendation model is not trained yet',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        # Get recommendations
        recommendations = recommender.get_recommendations(user_id, n_recommendations)
        
        # Log user activity for incremental learning
        if incremental_recommender:
            incremental_recommender.update_with_new_activity(user_id, 'api_request')
        
        return jsonify({
            'user_id': user_id,
            'recommendations': recommendations,
            'n_recommendations': len(recommendations),
            'timestamp': datetime.now().isoformat()
        })
    
    except BadRequest as e:
        raise e
    except Exception as e:
        logger.error(f"Error getting recommendations for user {user_id}: {e}")
        logger.error(traceback.format_exc())
        raise InternalServerError("Failed to generate recommendations")

@app.route('/recommendations', methods=['POST'])
def get_batch_recommendations():
    """Get recommendations for multiple users"""
    try:
        data = request.get_json()
        
        if not data or 'user_ids' not in data:
            raise BadRequest("user_ids required in request body")
        
        user_ids = data['user_ids']
        if not isinstance(user_ids, list) or not user_ids:
            raise BadRequest("user_ids must be a non-empty list")
        
        if len(user_ids) > 50:
            raise BadRequest("Maximum 50 users per batch request")
        
        n_recommendations = data.get('n_recommendations', 5)
        if n_recommendations <= 0 or n_recommendations > 20:
            raise BadRequest("n_recommendations must be between 1 and 20")
        
        # Check if model is ready
        if not recommender or not recommender.is_trained:
            return jsonify({
                'error': 'Model not ready',
                'message': 'Recommendation model is not trained yet',
                'timestamp': datetime.now().isoformat()
            }), 503
        
        # Get recommendations for each user
        batch_recommendations = {}
        failed_users = []
        
        for user_id in user_ids:
            try:
                recommendations = recommender.get_recommendations(user_id, n_recommendations)
                batch_recommendations[str(user_id)] = recommendations
                
                # Log activity for incremental learning
                if incremental_recommender:
                    incremental_recommender.update_with_new_activity(user_id, 'api_request')
                    
            except Exception as e:
                logger.warning(f"Failed to get recommendations for user {user_id}: {e}")
                failed_users.append(user_id)
        
        return jsonify({
            'recommendations': batch_recommendations,
            'successful_users': len(batch_recommendations),
            'failed_users': failed_users,
            'timestamp': datetime.now().isoformat()
        })
    
    except BadRequest as e:
        raise e
    except Exception as e:
        logger.error(f"Error in batch recommendations: {e}")
        logger.error(traceback.format_exc())
        raise InternalServerError("Failed to generate batch recommendations")

@app.route('/user/<int:user_id>/activity', methods=['POST'])
def log_user_activity(user_id):
    """Log user activity for incremental learning"""
    try:
        data = request.get_json()
        
        if not data or 'activity_type' not in data:
            raise BadRequest("activity_type required in request body")
        
        activity_type = data['activity_type']
        course_id = data.get('course_id')
        
        # Log activity for incremental learning
        if incremental_recommender:
            incremental_recommender.update_with_new_activity(user_id, activity_type, course_id)
        
        return jsonify({
            'message': 'Activity logged successfully',
            'user_id': user_id,
            'activity_type': activity_type,
            'course_id': course_id,
            'timestamp': datetime.now().isoformat()
        })
    
    except BadRequest as e:
        raise e
    except Exception as e:
        logger.error(f"Error logging activity for user {user_id}: {e}")
        raise InternalServerError("Failed to log user activity")

@app.route('/model/retrain', methods=['POST'])
def manual_retrain():
    """Manually trigger model retraining"""
    try:
        logger.info("Manual retrain requested")
        
        # Run training in background thread to avoid timeout
        def background_training():
            try:
                if train_model():
                    run_evaluation()
                    logger.info("Manual retrain completed successfully")
                else:
                    logger.error("Manual retrain failed")
            except Exception as e:
                logger.error(f"Background training error: {e}")
        
        Thread(target=background_training, daemon=True).start()
        
        return jsonify({
            'message': 'Model retraining started',
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error starting manual retrain: {e}")
        raise InternalServerError("Failed to start retraining")

@app.route('/model/status', methods=['GET'])
def model_status():
    """Get model status information"""
    try:
        model_path = TRAINING_CONFIG['model_path']
        
        status_info = {
            'model_loaded': recommender is not None and recommender.is_trained,
            'model_file_exists': os.path.exists(model_path),
            'timestamp': datetime.now().isoformat()
        }
        
        if os.path.exists(model_path):
            stat = os.stat(model_path)
            status_info['model_last_modified'] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            status_info['model_size_bytes'] = stat.st_size
        
        return jsonify(status_info)
    
    except Exception as e:
        logger.error(f"Error getting model status: {e}")
        raise InternalServerError("Failed to get model status")

@app.route('/evaluation/latest', methods=['GET'])
def get_latest_evaluation():
    """Get latest evaluation results"""
    try:
        # Find latest evaluation file
        logs_dir = "logs"
        eval_files = [f for f in os.listdir(logs_dir) if f.startswith('evaluation_') and f.endswith('.json')]
        
        if not eval_files:
            return jsonify({
                'message': 'No evaluation results available',
                'timestamp': datetime.now().isoformat()
            }), 404
        
        # Get most recent evaluation file
        latest_file = max(eval_files, key=lambda f: os.path.getctime(os.path.join(logs_dir, f)))
        
        with open(os.path.join(logs_dir, latest_file), 'r') as f:
            evaluation_data = json.load(f)
        
        return jsonify({
            'evaluation_file': latest_file,
            'evaluation_data': evaluation_data,
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting evaluation results: {e}")
        raise InternalServerError("Failed to get evaluation results")

@app.route('/system/info', methods=['GET'])
def system_info():
    """Get system information"""
    try:
        return jsonify({
            'system': 'Course Recommendation System',
            'version': '1.0.0',
            'api_config': {
                'host': API_CONFIG['host'],
                'port': API_CONFIG['port'],
                'debug': API_CONFIG['debug']
            },
            'model_config': {
                'collaborative_weight': recommender.collaborative_weight if recommender else None,
                'content_weight': recommender.content_weight if recommender else None
            },
            'uptime': datetime.now().isoformat(),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        logger.error(f"Error getting system info: {e}")
        raise InternalServerError("Failed to get system information")

def main():
    """Main function to start the application"""
    try:
        logger.info("Starting Course Recommendation API Server...")
        
        # Initialize the recommendation system
        if not initialize_system():
            logger.error("Failed to initialize system, exiting...")
            sys.exit(1)
        
        # Setup training scheduler
        setup_scheduler()
        
        logger.info("System ready - API server starting...")
        
        # Start Flask app
        app.run(
            host=API_CONFIG['host'],
            port=API_CONFIG['port'],
            debug=API_CONFIG['debug'],
            threaded=True
        )
    
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    except Exception as e:
        logger.error(f"Application error: {e}")
        logger.error(traceback.format_exc())
    finally:
        cleanup_on_exit()

if __name__ == '__main__':
    main()