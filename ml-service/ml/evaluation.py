"""
Model evaluation utilities for Course Recommendation System
Provides metrics to assess recommendation quality
"""

import sys
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging
from sklearn.model_selection import train_test_split
from datetime import datetime, timedelta
import random

from config import EVALUATION_CONFIG, MODEL_CONFIG

logger = logging.getLogger(__name__)

class ModelEvaluator:
    """Evaluates recommendation model performance"""
    
    def __init__(self, recommender, db_manager):
        self.recommender = recommender
        self.db = db_manager
        self.test_size = EVALUATION_CONFIG['test_size']
        self.precision_k = EVALUATION_CONFIG['precision_k']
        self.recall_k = EVALUATION_CONFIG['recall_k']
        self.min_test_users = EVALUATION_CONFIG['min_test_users']
    
    def create_evaluation_split(self) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Create train/test split for evaluation"""
        try:
            enrollments = self.db.get_enrollments_data()
            
            if enrollments.empty:
                logger.warning("No enrollment data available for evaluation")
                return pd.DataFrame(), pd.DataFrame()
            
            # Sort by enrollment date to create temporal split
            enrollments = enrollments.sort_values('enrollment_date')
            
            # Split by time rather than random to simulate real-world scenario
            split_date = enrollments['enrollment_date'].quantile(1 - self.test_size)
            
            train_data = enrollments[enrollments['enrollment_date'] <= split_date]
            test_data = enrollments[enrollments['enrollment_date'] > split_date]
            
            logger.info(f"Evaluation split created: {len(train_data)} train, {len(test_data)} test")
            
            return train_data, test_data
        
        except Exception as e:
            logger.error(f"Error creating evaluation split: {e}")
            return pd.DataFrame(), pd.DataFrame()
    
    def calculate_precision_at_k(self, recommendations: List[int], actual_courses: List[int], k: int) -> float:
        """Calculate precision@k metric"""
        if not recommendations or k <= 0:
            return 0.0
        
        top_k_recs = recommendations[:k]
        relevant_items = set(actual_courses)
        
        if not relevant_items:
            return 0.0
        
        correct_predictions = sum(1 for item in top_k_recs if item in relevant_items)
        return correct_predictions / min(k, len(top_k_recs))
    
    def calculate_recall_at_k(self, recommendations: List[int], actual_courses: List[int], k: int) -> float:
        """Calculate recall@k metric"""
        if not recommendations or not actual_courses or k <= 0:
            return 0.0
        
        top_k_recs = recommendations[:k]
        relevant_items = set(actual_courses)
        
        correct_predictions = sum(1 for item in top_k_recs if item in relevant_items)
        return correct_predictions / len(relevant_items)
    
    def calculate_ndcg_at_k(self, recommendations: List[int], actual_courses: List[int], k: int) -> float:
        """Calculate NDCG@k metric"""
        if not recommendations or not actual_courses or k <= 0:
            return 0.0
        
        def dcg_at_k(relevance_scores: List[float], k: int) -> float:
            """Calculate DCG@k"""
            dcg = 0.0
            for i, rel in enumerate(relevance_scores[:k]):
                dcg += rel / np.log2(i + 2)  # i+2 because log2(1) = 0
            return dcg
        
        # Create relevance scores (1 for relevant, 0 for not relevant)
        top_k_recs = recommendations[:k]
        relevance_scores = [1.0 if course in actual_courses else 0.0 for course in top_k_recs]
        
        # Calculate DCG
        dcg = dcg_at_k(relevance_scores, k)
        
        # Calculate IDCG (ideal DCG)
        ideal_relevance = [1.0] * min(k, len(actual_courses)) + [0.0] * max(0, k - len(actual_courses))
        idcg = dcg_at_k(ideal_relevance, k)
        
        return dcg / idcg if idcg > 0 else 0.0
    
    def evaluate_user_recommendations(self, user_id: int, test_courses: List[int]) -> Dict[str, float]:
        """Evaluate recommendations for a single user"""
        try:
            # Get recommendations for this user
            recommendations = self.recommender.get_recommendations(user_id, n_recommendations=max(self.precision_k))
            recommended_course_ids = [rec['course_id'] for rec in recommendations]
            
            if not recommended_course_ids:
                return {}
            
            # Calculate metrics for different k values
            metrics = {}
            
            for k in self.precision_k:
                precision = self.calculate_precision_at_k(recommended_course_ids, test_courses, k)
                metrics[f'precision@{k}'] = precision
            
            for k in self.recall_k:
                recall = self.calculate_recall_at_k(recommended_course_ids, test_courses, k)
                metrics[f'recall@{k}'] = recall
            
            for k in [5, 10]:  # NDCG for common k values
                ndcg = self.calculate_ndcg_at_k(recommended_course_ids, test_courses, k)
                metrics[f'ndcg@{k}'] = ndcg
            
            return metrics
        
        except Exception as e:
            logger.error(f"Error evaluating user {user_id}: {e}")
            return {}
    
    def evaluate_model(self) -> Optional[Dict[str, float]]:
        """Evaluate the recommendation model"""
        try:
            logger.info("Starting model evaluation...")
            
            # Create evaluation split
            train_data, test_data = self.create_evaluation_split()
            
            if test_data.empty:
                logger.warning("No test data available for evaluation")
                return None
            
            # Get users who have enrollments in test set
            test_users = test_data['student_id'].unique()
            
            if len(test_users) < self.min_test_users:
                logger.warning(f"Insufficient test users: {len(test_users)} < {self.min_test_users}")
                return None
            
            # Limit to reasonable number of test users for performance
            if len(test_users) > 50:
                test_users = random.sample(list(test_users), 50)
            
            logger.info(f"Evaluating on {len(test_users)} test users")
            
            # Collect metrics for all users
            all_metrics = []
            evaluated_users = 0
            
            for user_id in test_users:
                # Get test courses for this user
                user_test_courses = test_data[test_data['student_id'] == user_id]['course_id'].tolist()
                
                if not user_test_courses:
                    continue
                
                # Evaluate recommendations for this user
                user_metrics = self.evaluate_user_recommendations(user_id, user_test_courses)
                
                if user_metrics:
                    all_metrics.append(user_metrics)
                    evaluated_users += 1
            
            if not all_metrics:
                logger.warning("No users could be evaluated")
                return None
            
            # Calculate average metrics
            avg_metrics = {}
            all_metric_names = all_metrics[0].keys()
            
            for metric_name in all_metric_names:
                values = [metrics[metric_name] for metrics in all_metrics if metric_name in metrics]
                avg_metrics[metric_name] = np.mean(values) if values else 0.0
            
            # Add some additional metrics
            avg_metrics['evaluated_users'] = evaluated_users
            avg_metrics['total_test_users'] = len(test_users)
            avg_metrics['evaluation_coverage'] = evaluated_users / len(test_users)
            
            logger.info(f"Model evaluation completed on {evaluated_users} users")
            return avg_metrics
        
        except Exception as e:
            logger.error(f"Error in model evaluation: {e}")
            return None
    
    def evaluate_recommendation_diversity(self, n_users: int = 20) -> Dict[str, float]:
        """Evaluate diversity of recommendations across users"""
        try:
            students = self.db.get_students()
            
            if students.empty:
                return {}
            
            # Sample users for diversity evaluation
            sample_users = students.sample(min(n_users, len(students)))['id'].tolist()
            
            all_recommendations = []
            for user_id in sample_users:
                recommendations = self.recommender.get_recommendations(user_id, n_recommendations=10)
                course_ids = [rec['course_id'] for rec in recommendations]
                all_recommendations.extend(course_ids)
            
            if not all_recommendations:
                return {}
            
            # Calculate diversity metrics
            unique_courses = set(all_recommendations)
            total_recommendations = len(all_recommendations)
            
            diversity_metrics = {
                'unique_courses_recommended': len(unique_courses),
                'total_recommendations': total_recommendations,
                'diversity_ratio': len(unique_courses) / total_recommendations if total_recommendations > 0 else 0,
                'avg_recommendations_per_user': total_recommendations / len(sample_users)
            }
            
            return diversity_metrics
        
        except Exception as e:
            logger.error(f"Error evaluating diversity: {e}")
            return {}
    
    def evaluate_popularity_bias(self, n_users: int = 20) -> Dict[str, float]:
        """Evaluate if recommendations are biased towards popular courses"""
        try:
            # Get course popularity
            course_features = self.db.get_course_features()
            
            if course_features.empty:
                return {}
            
            # Calculate popularity scores
            course_popularity = course_features.set_index('course_id')['enrollment_count'].to_dict()
            
            # Get recommendations for sample users
            students = self.db.get_students()
            if students.empty:
                return {}
            
            sample_users = students.sample(min(n_users, len(students)))['id'].tolist()
            
            recommended_popularities = []
            for user_id in sample_users:
                recommendations = self.recommender.get_recommendations(user_id, n_recommendations=5)
                for rec in recommendations:
                    course_id = rec['course_id']
                    if course_id in course_popularity:
                        recommended_popularities.append(course_popularity[course_id])
            
            if not recommended_popularities:
                return {}
            
            # Calculate bias metrics
            avg_popularity = np.mean(list(course_popularity.values()))
            avg_recommended_popularity = np.mean(recommended_popularities)
            
            bias_metrics = {
                'avg_course_popularity': avg_popularity,
                'avg_recommended_popularity': avg_recommended_popularity,
                'popularity_bias_ratio': avg_recommended_popularity / avg_popularity if avg_popularity > 0 else 0
            }
            
            return bias_metrics
        
        except Exception as e:
            logger.error(f"Error evaluating popularity bias: {e}")
            return {}
    
    def generate_evaluation_report(self) -> Dict[str, any]:
        """Generate comprehensive evaluation report"""
        logger.info("Generating comprehensive evaluation report...")
        
        report = {
            'evaluation_timestamp': datetime.now().isoformat(),
            'model_performance': {},
            'diversity_metrics': {},
            'bias_metrics': {},
            'system_info': {
                'precision_k_values': self.precision_k,
                'recall_k_values': self.recall_k,
                'test_size': self.test_size
            }
        }
        
        # Model performance
        performance_metrics = self.evaluate_model()
        if performance_metrics:
            report['model_performance'] = performance_metrics
        
        # Diversity metrics
        diversity_metrics = self.evaluate_recommendation_diversity()
        if diversity_metrics:
            report['diversity_metrics'] = diversity_metrics
        
        # Bias metrics
        bias_metrics = self.evaluate_popularity_bias()
        if bias_metrics:
            report['bias_metrics'] = bias_metrics
        
        return report

def run_standalone_evaluation():
    """Run evaluation as standalone script"""
    import sys
    import os
    
    # Add current directory to path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    from core import DatabaseManager, HybridRecommender
    from config import TRAINING_CONFIG
    
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    try:
        # Initialize components
        db_manager = DatabaseManager()
        
        # Load trained model
        model_path = TRAINING_CONFIG['model_path']
        if not os.path.exists(model_path):
            logger.error(f"No trained model found at {model_path}")
            return False
        
        recommender = HybridRecommender.load_model(model_path, db_manager)
        if not recommender:
            logger.error("Failed to load model")
            return False
        
        # Run evaluation
        evaluator = ModelEvaluator(recommender, db_manager)
        report = evaluator.generate_evaluation_report()
        
        # Print results
        print("\n" + "="*60)
        print("COURSE RECOMMENDATION SYSTEM - EVALUATION REPORT")
        print("="*60)
        
        if report['model_performance']:
            print("\nMODEL PERFORMANCE:")
            for metric, value in report['model_performance'].items():
                print(f"  {metric}: {value:.4f}")
        
        if report['diversity_metrics']:
            print("\nDIVERSITY METRICS:")
            for metric, value in report['diversity_metrics'].items():
                print(f"  {metric}: {value:.4f}")
        
        if report['bias_metrics']:
            print("\nBIAS METRICS:")
            for metric, value in report['bias_metrics'].items():
                print(f"  {metric}: {value:.4f}")
        
        print("\n" + "="*60)
        
        db_manager.close()
        return True
    
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        return False

if __name__ == "__main__":
    success = run_standalone_evaluation()
    sys.exit(0 if success else 1)