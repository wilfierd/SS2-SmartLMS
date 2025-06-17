"""
Configuration file for Course Recommendation System
Contains all configurable parameters for the ML system
"""

# Database Configuration
DATABASE_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': 'zzzNszzz19',
    'database': 'lms_db',
    'charset': 'utf8mb4',
    'autocommit': True
}

# Model Parameters
MODEL_CONFIG = {
    'collaborative_weight': 0.6,
    'content_weight': 0.4,
    'min_interactions': 3,  # Minimum interactions for collaborative filtering
    'n_recommendations': 5,  # Number of recommendations to return
    'similarity_threshold': 0.1,  # Minimum similarity for recommendations
    'random_state': 42
}

# Feature Engineering Parameters
FEATURE_CONFIG = {
    'engagement_weights': {
        'quiz_attempt': 2.0,
        'assignment_submit': 3.0,
        'course_access': 1.0,
        'module_complete': 4.0,
        'session_join': 1.5,
        'login': 0.5
    },
    'course_attractiveness_weights': {
        'enrollment_count': 0.3,
        'completion_rate': 0.4,
        'avg_rating': 0.3  # We'll simulate this from completion data
    },
    'time_decay_factor': 0.95,  # Decay factor for older activities
    'max_days_lookback': 90  # Maximum days to look back for activities
}

# Training Configuration
TRAINING_CONFIG = {
    'model_path': 'ml/model.pkl',
    'backup_model_path': 'ml/model_backup.pkl',
    'retrain_threshold_days': 7,  # Retrain if model is older than this
    'min_training_samples': 10,  # Minimum samples needed for training
    'cross_validation_folds': 3
}

# Evaluation Configuration
EVALUATION_CONFIG = {
    'test_size': 0.2,
    'precision_k': [3, 5, 10],
    'recall_k': [3, 5, 10],
    'min_test_users': 5
}

# API Configuration
API_CONFIG = {
    'host': '0.0.0.0',
    'port': 8000,
    'debug': False,
    'cache_ttl': 3600,  # Cache recommendations for 1 hour
    'max_concurrent_requests': 100
}

# Logging Configuration
LOGGING_CONFIG = {
    'level': 'INFO',
    'format': '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    'file': 'ml/recommendation.log',
    'max_bytes': 10485760,  # 10MB
    'backup_count': 5
}

# Data Refresh Configuration
REFRESH_CONFIG = {
    'incremental_update_minutes': 30,  # Update incremental data every 30 minutes
    'full_retrain_hours': 24,  # Full retrain every 24 hours
    'cleanup_old_activities_days': 365  # Keep activities for 1 year
}