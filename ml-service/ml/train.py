#!/usr/bin/env python3
"""
Training pipeline for Course Recommendation System
Loads data, trains the model, and saves it for deployment
"""

import os
import sys
import logging
from datetime import datetime
import traceback

# Add current directory to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core import DatabaseManager, HybridRecommender
from config import TRAINING_CONFIG, LOGGING_CONFIG
from evaluation import ModelEvaluator

def setup_logging():
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, LOGGING_CONFIG['level']),
        format=LOGGING_CONFIG['format'],
        handlers=[
            logging.FileHandler(LOGGING_CONFIG['file']),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

def check_data_availability(db_manager):
    """Check if sufficient data is available for training"""
    logger = logging.getLogger(__name__)
    
    try:
        # Check for minimum data requirements
        students = db_manager.get_students()
        enrollments = db_manager.get_enrollments_data()
        courses = db_manager.get_course_features()
        
        logger.info(f"Data availability check:")
        logger.info(f"  - Students: {len(students)}")
        logger.info(f"  - Enrollments: {len(enrollments)}")
        logger.info(f"  - Courses: {len(courses)}")
        
        if len(enrollments) < TRAINING_CONFIG['min_training_samples']:
            logger.warning(f"Insufficient training data: {len(enrollments)} enrollments < {TRAINING_CONFIG['min_training_samples']} required")
            return False
        
        if len(courses) == 0:
            logger.error("No courses available for recommendations")
            return False
        
        if len(students) == 0:
            logger.error("No students found in database")
            return False
        
        return True
    
    except Exception as e:
        logger.error(f"Error checking data availability: {e}")
        return False

def backup_existing_model():
    """Backup existing model if it exists"""
    logger = logging.getLogger(__name__)
    
    model_path = TRAINING_CONFIG['model_path']
    backup_path = TRAINING_CONFIG['backup_model_path']
    
    if os.path.exists(model_path):
        try:
            if os.path.exists(backup_path):
                os.remove(backup_path)
            os.rename(model_path, backup_path)
            logger.info(f"Existing model backed up to {backup_path}")
        except Exception as e:
            logger.warning(f"Could not backup existing model: {e}")

def train_model():
    """Main training function"""
    logger = setup_logging()
    logger.info("Starting course recommendation model training...")
    
    db_manager = None
    try:
        # Initialize database connection
        logger.info("Connecting to database...")
        db_manager = DatabaseManager()
        
        # Check data availability
        logger.info("Checking data availability...")
        if not check_data_availability(db_manager):
            logger.error("Insufficient training data. Aborting training.")
            return False
        
        # Backup existing model
        backup_existing_model()
        
        # Initialize and train recommender
        logger.info("Initializing hybrid recommender...")
        recommender = HybridRecommender(db_manager)
        
        logger.info("Training model...")
        start_time = datetime.now()
        recommender.train()
        training_time = (datetime.now() - start_time).total_seconds()
        
        logger.info(f"Model training completed in {training_time:.2f} seconds")
        
        # Evaluate model if possible
        logger.info("Evaluating model performance...")
        evaluator = ModelEvaluator(recommender, db_manager)
        evaluation_results = evaluator.evaluate_model()
        
        if evaluation_results:
            logger.info("Model evaluation results:")
            for metric, value in evaluation_results.items():
                logger.info(f"  - {metric}: {value:.4f}")
        else:
            logger.warning("Model evaluation could not be performed")
        
        # Save trained model
        logger.info("Saving trained model...")
        model_path = TRAINING_CONFIG['model_path']
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        recommender.save_model(model_path)
        logger.info(f"Model saved to {model_path}")
        
        # Test model loading
        logger.info("Testing model loading...")
        loaded_recommender = HybridRecommender.load_model(model_path, db_manager)
        if loaded_recommender:
            logger.info("Model loading test successful")
        else:
            logger.error("Model loading test failed")
            return False
        
        logger.info("Training pipeline completed successfully!")
        return True
    
    except Exception as e:
        logger.error(f"Training failed with error: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False
    
    finally:
        if db_manager:
            db_manager.close()

def should_retrain():
    """Check if model should be retrained based on age"""
    model_path = TRAINING_CONFIG['model_path']
    
    if not os.path.exists(model_path):
        return True
    
    # Check model age
    model_age_days = (datetime.now().timestamp() - os.path.getmtime(model_path)) / (24 * 3600)
    threshold_days = TRAINING_CONFIG['retrain_threshold_days']
    
    return model_age_days > threshold_days

def quick_test():
    """Quick test of the trained model"""
    logger = logging.getLogger(__name__)
    
    try:
        db_manager = DatabaseManager()
        model_path = TRAINING_CONFIG['model_path']
        
        if not os.path.exists(model_path):
            logger.error("No trained model found for testing")
            return False
        
        # Load model
        recommender = HybridRecommender.load_model(model_path, db_manager)
        if not recommender:
            logger.error("Failed to load model for testing")
            return False
        
        # Get a test user
        students = db_manager.get_students()
        if students.empty:
            logger.warning("No students available for testing")
            return True
        
        test_user_id = students.iloc[0]['id']
        logger.info(f"Testing recommendations for user {test_user_id}")
        
        # Get recommendations
        recommendations = recommender.get_recommendations(test_user_id, n_recommendations=3)
        
        if recommendations:
            logger.info(f"Test successful: Generated {len(recommendations)} recommendations")
            for rec in recommendations:
                logger.info(f"  - Course: {rec['title']} (Score: {rec['score']:.4f})")
        else:
            logger.warning("Test generated no recommendations")
        
        db_manager.close()
        return True
    
    except Exception as e:
        logger.error(f"Quick test failed: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Course Recommendation Model Training")
    parser.add_argument("--force", action="store_true", help="Force retrain even if model is recent")
    parser.add_argument("--test-only", action="store_true", help="Only run quick test")
    parser.add_argument("--check-data", action="store_true", help="Only check data availability")
    
    args = parser.parse_args()
    
    if args.test_only:
        logger = setup_logging()
        success = quick_test()
        sys.exit(0 if success else 1)
    
    if args.check_data:
        logger = setup_logging()
        db_manager = DatabaseManager()
        success = check_data_availability(db_manager)
        db_manager.close()
        sys.exit(0 if success else 1)
    
    # Check if retrain is needed
    if not args.force and not should_retrain():
        logger = setup_logging()
        logger.info("Model is recent enough, skipping training. Use --force to retrain anyway.")
        sys.exit(0)
    
    # Run training
    success = train_model()
    
    if success:
        # Run quick test after training
        quick_test()
        sys.exit(0)
    else:
        sys.exit(1)