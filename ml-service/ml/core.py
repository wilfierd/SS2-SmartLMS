"""
Core recommendation engine with collaborative filtering, content-based filtering,
and hybrid approach for LMS course recommendations
"""

import os
import pymysql
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import pickle
import logging
from typing import List, Dict, Tuple, Optional
import warnings
from logging.handlers import RotatingFileHandler
warnings.filterwarnings('ignore')

from config import DATABASE_CONFIG, MODEL_CONFIG, FEATURE_CONFIG, LOGGING_CONFIG

# Setup logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Ensure logs directory exists
os.makedirs("logs", exist_ok=True)

handler = RotatingFileHandler(
    "logs/core.log", maxBytes=5*1024*1024, backupCount=3
)
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(message)s')
handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(handler)

class DatabaseManager:
    """Handles all database operations for the recommendation system"""
    
    def __init__(self):
        self.connection = None
        self.connect()
    
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = pymysql.connect(**DATABASE_CONFIG)
            logger.info("Database connection established")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
    
    def ensure_connection(self):
        """Ensure database connection is active"""
        try:
            self.connection.ping(reconnect=True)
        except:
            self.connect()
    
    def execute_query(self, query: str, params: tuple = None) -> pd.DataFrame:
        """Execute query and return results as DataFrame"""
        self.ensure_connection()
        try:
            return pd.read_sql(query, self.connection, params=params)
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            raise
    
    def get_user_activities(self, days_back: int = 90) -> pd.DataFrame:
        """Get user activities for engagement scoring"""
        cutoff_date = datetime.now() - timedelta(days=days_back)
        query = """
        SELECT user_id, type, created_at, metadata
        FROM user_activities 
        WHERE created_at >= %s
        ORDER BY created_at DESC
        """
        return self.execute_query(query, (cutoff_date,))
    
    def get_enrollments_data(self) -> pd.DataFrame:
        """Get enrollment data with course information"""
        query = """
        SELECT 
            e.student_id,
            e.course_id,
            e.completion_status,
            e.enrollment_date,
            e.completion_date,
            e.progress,
            c.title as course_title,
            c.description as course_description,
            c.instructor_id,
            c.department_id,
            c.status as course_status,
            d.name as department_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.status = 'published'
        """
        return self.execute_query(query)
    
    def get_quiz_attempts(self) -> pd.DataFrame:
        """Get quiz attempt data for engagement scoring"""
        query = """
        SELECT 
            qa.student_id,
            q.course_id,
            qa.score,
            qa.is_passing,
            qa.start_time,
            qa.end_time
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.end_time IS NOT NULL
        """
        return self.execute_query(query)
    
    def get_assignment_submissions(self) -> pd.DataFrame:
        """Get assignment submission data"""
        query = """
        SELECT 
            asub.student_id,
            a.course_id,
            asub.grade,
            asub.submission_date,
            asub.is_late
        FROM assignment_submissions asub
        JOIN assignments a ON asub.assignment_id = a.id
        WHERE asub.grade IS NOT NULL
        """
        return self.execute_query(query)
    
    def get_course_features(self) -> pd.DataFrame:
        """Get course features for content-based filtering"""
        query = """
        SELECT 
            c.id as course_id,
            c.title,
            c.description,
            c.instructor_id,
            c.department_id,
            d.name as department_name,
            COUNT(DISTINCT e.student_id) as enrollment_count,
            AVG(CASE WHEN e.completion_status = 'completed' THEN 1 ELSE 0 END) as completion_rate,
            COUNT(DISTINCT cm.id) as module_count,
            COUNT(DISTINCT q.id) as quiz_count,
            COUNT(DISTINCT a.id) as assignment_count
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN course_modules cm ON c.id = cm.course_id
        LEFT JOIN quizzes q ON c.id = q.course_id
        LEFT JOIN assignments a ON c.id = a.course_id
        WHERE c.status = 'published'
        GROUP BY c.id, c.title, c.description, c.instructor_id, c.department_id, d.name
        """
        return self.execute_query(query)
    
    def get_students(self) -> pd.DataFrame:
        """Get student information"""
        query = """
        SELECT id, email, first_name, last_name, created_at
        FROM users 
        WHERE role = 'student'
        """
        return self.execute_query(query)
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            logger.info("Database connection closed")

class FeatureEngineer:
    """Handles feature engineering for recommendations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.engagement_weights = FEATURE_CONFIG['engagement_weights']
        self.time_decay = FEATURE_CONFIG['time_decay_factor']
    
    def calculate_engagement_scores(self) -> pd.DataFrame:
        """Calculate engagement scores for students"""
        # Get activities
        activities = self.db.get_user_activities()
        quiz_attempts = self.db.get_quiz_attempts()
        assignments = self.db.get_assignment_submissions()
        
        engagement_scores = []
        
        # Process activities
        if not activities.empty:
            activities['days_ago'] = (datetime.now() - pd.to_datetime(activities['created_at'])).dt.days
            activities['weight'] = activities['type'].map(self.engagement_weights).fillna(1.0)
            activities['time_weight'] = self.time_decay ** activities['days_ago']
            activities['engagement_score'] = activities['weight'] * activities['time_weight']
            
            activity_scores = activities.groupby('user_id')['engagement_score'].sum().reset_index()
            activity_scores.columns = ['student_id', 'activity_engagement']
            engagement_scores.append(activity_scores)
        
        # Process quiz attempts
        if not quiz_attempts.empty:
            quiz_attempts['quiz_score'] = quiz_attempts['score'] / 100.0  # Normalize to 0-1
            quiz_attempts['bonus'] = quiz_attempts['is_passing'].astype(float) * 0.5
            quiz_attempts['total_score'] = quiz_attempts['quiz_score'] + quiz_attempts['bonus']
            
            quiz_engagement = quiz_attempts.groupby('student_id').agg({
                'total_score': 'mean',
                'course_id': 'count'
            }).reset_index()
            quiz_engagement.columns = ['student_id', 'avg_quiz_score', 'quiz_count']
            quiz_engagement['quiz_engagement'] = quiz_engagement['avg_quiz_score'] * np.log1p(quiz_engagement['quiz_count'])
            engagement_scores.append(quiz_engagement[['student_id', 'quiz_engagement']])
        
        # Process assignments
        if not assignments.empty:
            assignments['assignment_score'] = assignments['grade'] / 100.0
            assignments['timeliness_bonus'] = (~assignments['is_late']).astype(float) * 0.2
            assignments['total_score'] = assignments['assignment_score'] + assignments['timeliness_bonus']
            
            assignment_engagement = assignments.groupby('student_id').agg({
                'total_score': 'mean',
                'course_id': 'count'
            }).reset_index()
            assignment_engagement.columns = ['student_id', 'avg_assignment_score', 'assignment_count']
            assignment_engagement['assignment_engagement'] = assignment_engagement['avg_assignment_score'] * np.log1p(assignment_engagement['assignment_count'])
            engagement_scores.append(assignment_engagement[['student_id', 'assignment_engagement']])
        
        # Combine all engagement scores
        if engagement_scores:
            combined_engagement = engagement_scores[0]
            for df in engagement_scores[1:]:
                combined_engagement = combined_engagement.merge(df, on='student_id', how='outer')
            
            # Fill NaN values with 0 and calculate total engagement
            combined_engagement = combined_engagement.fillna(0)
            engagement_cols = [col for col in combined_engagement.columns if col != 'student_id']
            combined_engagement['total_engagement'] = combined_engagement[engagement_cols].sum(axis=1)
            
            return combined_engagement[['student_id', 'total_engagement']]
        else:
            # Return empty DataFrame with correct structure
            return pd.DataFrame(columns=['student_id', 'total_engagement'])
    
    def calculate_course_attractiveness(self) -> pd.DataFrame:
        """Calculate course attractiveness scores"""
        course_features = self.db.get_course_features()
        
        if course_features.empty:
            return pd.DataFrame(columns=['course_id', 'attractiveness_score'])
        
        # Normalize features
        scaler = StandardScaler()
        
        # Handle missing values
        course_features['enrollment_count'] = course_features['enrollment_count'].fillna(0)
        course_features['completion_rate'] = course_features['completion_rate'].fillna(0)
        course_features['module_count'] = course_features['module_count'].fillna(0)
        course_features['quiz_count'] = course_features['quiz_count'].fillna(0)
        course_features['assignment_count'] = course_features['assignment_count'].fillna(0)
        
        # Calculate attractiveness score
        features_for_scoring = ['enrollment_count', 'completion_rate', 'module_count', 'quiz_count', 'assignment_count']
        if len(course_features) > 1:
            normalized_features = scaler.fit_transform(course_features[features_for_scoring])
            weights = [0.3, 0.4, 0.1, 0.1, 0.1]  # Weights for each feature
            course_features['attractiveness_score'] = np.dot(normalized_features, weights)
        else:
            course_features['attractiveness_score'] = 1.0
        
        return course_features[['course_id', 'attractiveness_score']]
    
    def detach(self):
        self.db = None

class CollaborativeFilter:
    """Implements collaborative filtering for course recommendations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.user_item_matrix = None
        self.user_similarity = None
    
    def build_user_item_matrix(self) -> pd.DataFrame:
        """Build user-item interaction matrix"""
        enrollments = self.db.get_enrollments_data()
        
        if enrollments.empty:
            return pd.DataFrame()
        
        # Create interaction scores based on completion status
        interaction_scores = {
            'not_started': 1.0,
            'in_progress': 2.0,
            'completed': 3.0
        }
        
        enrollments['interaction_score'] = enrollments['completion_status'].map(interaction_scores)
        
        # Add progress bonus
        enrollments['progress'] = enrollments['progress'].fillna(0)
        enrollments['interaction_score'] += enrollments['progress'] / 100.0
        
        # Create user-item matrix
        user_item_matrix = enrollments.pivot_table(
            index='student_id',
            columns='course_id',
            values='interaction_score',
            fill_value=0
        )
        
        self.user_item_matrix = user_item_matrix
        return user_item_matrix
    
    def calculate_user_similarity(self):
        """Calculate user-user similarity matrix"""
        if self.user_item_matrix is None or self.user_item_matrix.empty:
            return
        
        # Calculate cosine similarity
        self.user_similarity = cosine_similarity(self.user_item_matrix)
        self.user_similarity = pd.DataFrame(
            self.user_similarity,
            index=self.user_item_matrix.index,
            columns=self.user_item_matrix.index
        )
    
    def get_collaborative_recommendations(self, user_id: int, n_recommendations: int = 5) -> List[Tuple[int, float]]:
        """Get collaborative filtering recommendations for a user"""
        if self.user_similarity is None or user_id not in self.user_similarity.index:
            return []
        
        try:
            # Get similar users
            similar_users = self.user_similarity.loc[user_id].sort_values(ascending=False)[1:]  # Exclude self
            
            # Get courses the user hasn't taken
            user_courses = set(self.user_item_matrix.loc[user_id][self.user_item_matrix.loc[user_id] > 0].index)
            all_courses = set(self.user_item_matrix.columns)
            unrated_courses = all_courses - user_courses
            
            if not unrated_courses:
                return []
            
            # Calculate recommendation scores
            recommendations = {}
            
            for course_id in unrated_courses:
                score = 0
                similarity_sum = 0
                
                for similar_user_id, similarity in similar_users.head(10).items():  # Top 10 similar users
                    if similarity > MODEL_CONFIG['similarity_threshold']:
                        user_rating = self.user_item_matrix.loc[similar_user_id, course_id]
                        if user_rating > 0:
                            score += similarity * user_rating
                            similarity_sum += abs(similarity)
                
                if similarity_sum > 0:
                    recommendations[course_id] = score / similarity_sum
            
            # Sort and return top recommendations
            sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
            return sorted_recommendations[:n_recommendations]
        
        except Exception as e:
            logger.error(f"Error in collaborative recommendations for user {user_id}: {e}")
            return []
    
    def detach(self):
        self.db = None

class ContentBasedFilter:
    """Implements content-based filtering for course recommendations"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.course_features = None
        self.tfidf_vectorizer = None
        self.course_similarity = None
    
    def build_course_features(self):
        """Build course feature matrix"""
        courses = self.db.get_course_features()
        
        if courses.empty:
            return
        
        # Combine text features
        courses['text_features'] = (
            courses['title'].fillna('') + ' ' + 
            courses['description'].fillna('') + ' ' + 
            courses['department_name'].fillna('')
        )
        
        # TF-IDF vectorization of text features
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(courses['text_features'])
        
        # Calculate course similarity
        self.course_similarity = cosine_similarity(tfidf_matrix)
        self.course_similarity = pd.DataFrame(
            self.course_similarity,
            index=courses['course_id'],
            columns=courses['course_id']
        )
        
        self.course_features = courses
    
    def get_content_based_recommendations(self, user_id: int, n_recommendations: int = 5) -> List[Tuple[int, float]]:
        """Get content-based recommendations for a user"""
        if self.course_features is None or self.course_similarity is None:
            return []
        
        try:
            # Get user's enrolled courses
            enrollments = self.db.get_enrollments_data()
            user_courses = enrollments[enrollments['student_id'] == user_id]['course_id'].tolist()
            
            if not user_courses:
                # For new users, recommend popular courses
                popular_courses = self.course_features.nlargest(n_recommendations, 'enrollment_count')
                return [(row['course_id'], row['attractiveness_score']) for _, row in popular_courses.iterrows()]
            
            # Calculate scores for all courses
            recommendations = {}
            available_courses = set(self.course_similarity.index) - set(user_courses)
            
            for course_id in available_courses:
                similarity_scores = []
                for user_course_id in user_courses:
                    if user_course_id in self.course_similarity.index:
                        similarity = self.course_similarity.loc[user_course_id, course_id]
                        similarity_scores.append(similarity)
                
                if similarity_scores:
                    avg_similarity = np.mean(similarity_scores)
                    recommendations[course_id] = avg_similarity
            
            # Sort and return top recommendations
            sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
            return sorted_recommendations[:n_recommendations]
        
        except Exception as e:
            logger.error(f"Error in content-based recommendations for user {user_id}: {e}")
            return []
    
    def detach(self):
        self.db = None


class HybridRecommender:
    """Hybrid recommendation system combining collaborative and content-based filtering"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.collaborative_filter = CollaborativeFilter(db_manager)
        self.content_filter = ContentBasedFilter(db_manager)
        self.feature_engineer = FeatureEngineer(db_manager)
        
        self.collaborative_weight = MODEL_CONFIG['collaborative_weight']
        self.content_weight = MODEL_CONFIG['content_weight']
        
        self.is_trained = False
    
    def train(self):
        """Train the hybrid recommendation model"""
        logger.info("Starting model training...")
        
        # Train collaborative filtering
        self.collaborative_filter.build_user_item_matrix()
        self.collaborative_filter.calculate_user_similarity()
        
        # Train content-based filtering
        self.content_filter.build_course_features()
        
        self.is_trained = True
        logger.info("Model training completed")
    
    def get_recommendations(self, user_id: int, n_recommendations: int = None) -> List[Dict]:
        """Get hybrid recommendations for a user"""
        if not self.is_trained:
            logger.warning("Model not trained. Training now...")
            self.train()
        
        if n_recommendations is None:
            n_recommendations = MODEL_CONFIG['n_recommendations']
        
        # Get recommendations from both approaches
        collaborative_recs = self.collaborative_filter.get_collaborative_recommendations(user_id, n_recommendations * 2)
        content_recs = self.content_filter.get_content_based_recommendations(user_id, n_recommendations * 2)
        
        # Combine recommendations
        combined_scores = {}
        
        # Add collaborative filtering scores
        for course_id, score in collaborative_recs:
            combined_scores[course_id] = score * self.collaborative_weight
        
        # Add content-based scores
        for course_id, score in content_recs:
            if course_id in combined_scores:
                combined_scores[course_id] += score * self.content_weight
            else:
                combined_scores[course_id] = score * self.content_weight
        
        # Sort and get top recommendations
        sorted_recommendations = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        top_recommendations = sorted_recommendations[:n_recommendations]
        
        # Get course details
        course_features = self.content_filter.course_features
        recommendations_with_details = []
        
        for course_id, score in top_recommendations:
            if course_features is not None and course_id in course_features['course_id'].values:
                course_info = course_features[course_features['course_id'] == course_id].iloc[0]
                recommendations_with_details.append({
                    'course_id': int(course_id),
                    'title': course_info['title'],
                    'description': course_info['description'],
                    'department': course_info['department_name'],
                    'score': float(score),
                    'enrollment_count': int(course_info['enrollment_count']),
                    'completion_rate': float(course_info['completion_rate'])
                })
        
        return recommendations_with_details
    
    def save_model(self, filepath: str):
        """Save the trained model safely without pickling database connection"""
        try:
            # Tách db connection trước khi lưu
            self.collaborative_filter.detach()
            self.content_filter.detach()
            self.feature_engineer.detach()

            model_data = {
                'collaborative_filter': self.collaborative_filter,
                'content_filter': self.content_filter,
                'feature_engineer': self.feature_engineer,
                'is_trained': self.is_trained,
                'model_timestamp': datetime.now()
            }

            with open(filepath, 'wb') as f:
                pickle.dump(model_data, f)

            logger.info(f"Model saved to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
    
    @classmethod
    def load_model(cls, filepath: str, db_manager: DatabaseManager):
        """Load a trained model and restore DB connections"""
        try:
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)

            recommender = cls(db_manager)
            recommender.collaborative_filter = model_data['collaborative_filter']
            recommender.collaborative_filter.db = db_manager

            recommender.content_filter = model_data['content_filter']
            recommender.content_filter.db = db_manager

            recommender.feature_engineer = model_data['feature_engineer']
            recommender.feature_engineer.db = db_manager

            recommender.is_trained = model_data['is_trained']

            logger.info(f"Model loaded from {filepath}")
            return recommender

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return None


class IncrementalRecommender:
    """Handles incremental updates to the recommendation system"""
    
    def __init__(self, recommender: HybridRecommender):
        self.recommender = recommender
        self.last_update = datetime.now()
    
    def update_with_new_activity(self, user_id: int, activity_type: str, course_id: int = None):
        """Update recommendations based on new user activity"""
        try:
            # For now, we'll trigger a lightweight retrain
            # In a production system, this could be more sophisticated
            if (datetime.now() - self.last_update).total_seconds() > 1800:  # 30 minutes
                logger.info("Performing incremental update...")
                self.recommender.train()
                self.last_update = datetime.now()
        
        except Exception as e:
            logger.error(f"Error in incremental update: {e}")
    
    def should_retrain(self) -> bool:
        """Determine if model should be retrained"""
        time_since_update = (datetime.now() - self.last_update).total_seconds()
        return time_since_update > 3600  # 1 hour