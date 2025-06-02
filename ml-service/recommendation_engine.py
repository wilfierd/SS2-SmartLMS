"""
Real-time Recommendation Engine
Uses live database queries and advanced similarity calculations
"""
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import hashlib
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

class RecommendationEngine:
    def __init__(self, db_manager, redis_client=None):
        self.db = db_manager
        self.redis = redis_client
        self.cache_ttl = 3600  # 1 hour cache TTL
        self.similarity_matrix_ttl = 86400  # 24 hours for similarity matrix
        
    def _get_cache_key(self, prefix: str, student_id: int, **kwargs) -> str:
        """Generate cache key for Redis"""
        key_data = f"{prefix}:{student_id}:{json.dumps(sorted(kwargs.items()))}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[Dict]:
        """Get data from Redis cache"""
        if not self.redis:
            return None
        try:
            cached_data = self.redis.get(key)
            return json.loads(cached_data) if cached_data else None
        except Exception as e:
            logger.warning(f"Cache read error: {str(e)}")
            return None
    
    def _set_cache(self, key: str, data: Dict, ttl: int = None) -> None:
        """Set data in Redis cache"""
        if not self.redis:
            return
        try:
            self.redis.setex(
                key, 
                ttl or self.cache_ttl, 
                json.dumps(data, default=str)
            )
        except Exception as e:
            logger.warning(f"Cache write error: {str(e)}")
    
    def get_recommendations(self, student_id: int, limit: int = 3, force_refresh: bool = False) -> List[Dict]:
        """Get course recommendations for a student"""
        # Check cache first (unless force refresh)
        cache_key = self._get_cache_key("recommendations", student_id, limit=limit)
        
        if not force_refresh:
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                logger.info(f"Returning cached recommendations for student {student_id}")
                return cached_result
        
        logger.info(f"Generating fresh recommendations for student {student_id}")
        
        try:
            # Get student information
            student_info = self.db.get_student_info(student_id)
            if not student_info:
                return [{"error": f"Student {student_id} not found"}]
            
            # Get recommendations using multiple strategies
            recommendations = self._generate_hybrid_recommendations(student_id, limit)
            
            # Cache the results
            self._set_cache(cache_key, recommendations)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations for student {student_id}: {str(e)}")
            return [{"error": f"Failed to generate recommendations: {str(e)}"}]
    
    def _generate_hybrid_recommendations(self, student_id: int, limit: int) -> List[Dict]:
        """Generate recommendations using multiple strategies and combine them"""
        
        # Strategy 1: Collaborative Filtering
        collab_recs = self._collaborative_filtering_recommendations(student_id, limit * 2)
        
        # Strategy 2: Content-Based Filtering
        content_recs = self._content_based_recommendations(student_id, limit * 2)
        
        # Strategy 3: Popularity-Based (fallback)
        popular_recs = self._popularity_based_recommendations(student_id, limit)
        
        # Combine and rank recommendations
        final_recommendations = self._combine_recommendations(
            collab_recs, content_recs, popular_recs, limit
        )
        
        return final_recommendations
    
    def _collaborative_filtering_recommendations(self, student_id: int, limit: int) -> List[Dict]:
        """Collaborative filtering based on user-course interaction matrix"""
        try:
            # Get user-course matrix
            user_course_matrix = self.db.get_user_course_matrix()
            
            if user_course_matrix.empty or student_id not in user_course_matrix.index:
                logger.warning(f"No interaction data for student {student_id}")
                return []
            
            # Calculate course similarity matrix
            course_similarity_matrix = self._get_course_similarity_matrix(user_course_matrix)
            
            # Get student's enrolled courses
            student_courses = user_course_matrix.loc[student_id]
            enrolled_courses = student_courses[student_courses > 0].index.tolist()
            
            if not enrolled_courses:
                logger.warning(f"Student {student_id} has no enrolled courses")
                return []
            
            # Calculate recommendation scores
            recommendation_scores = {}
            
            for course_id in user_course_matrix.columns:
                if course_id in enrolled_courses:
                    continue
                
                score = 0
                total_weight = 0
                
                for enrolled_course in enrolled_courses:
                    if enrolled_course in course_similarity_matrix.index:
                        similarity = course_similarity_matrix.loc[enrolled_course, course_id]
                        interaction_strength = student_courses[enrolled_course]
                        
                        score += similarity * interaction_strength
                        total_weight += abs(similarity)
                
                if total_weight > 0:
                    recommendation_scores[course_id] = score / total_weight
            
            # Sort and return top recommendations
            sorted_recs = sorted(recommendation_scores.items(), key=lambda x: x[1], reverse=True)
            
            return self._format_recommendations(sorted_recs[:limit], "collaborative", student_id)
            
        except Exception as e:
            logger.error(f"Collaborative filtering error: {str(e)}")
            return []
    
    def _content_based_recommendations(self, student_id: int, limit: int) -> List[Dict]:
        """Content-based filtering using course descriptions and student preferences"""
        try:
            # Get student's enrolled courses
            enrollments = self.db.get_student_enrollments(student_id)
            if enrollments.empty:
                return []
            
            # Get all courses
            all_courses = self.db.get_all_courses()
            if all_courses.empty:
                return []
            
            # Create course content features
            course_features = self._extract_course_features(all_courses)
            
            # Get student's course preferences based on enrolled courses
            enrolled_course_ids = enrollments['course_id'].unique()
            student_preferences = self._calculate_student_preferences(
                enrolled_course_ids, course_features
            )
            
            # Find similar courses
            available_courses = all_courses[~all_courses['id'].isin(enrolled_course_ids)]
            
            recommendations = []
            for _, course in available_courses.iterrows():
                if course['id'] in course_features:
                    similarity = self._calculate_content_similarity(
                        student_preferences, course_features[course['id']]
                    )
                    recommendations.append((course['id'], similarity))
            
            # Sort and return top recommendations
            sorted_recs = sorted(recommendations, key=lambda x: x[1], reverse=True)
            
            return self._format_recommendations(sorted_recs[:limit], "content", student_id)
            
        except Exception as e:
            logger.error(f"Content-based filtering error: {str(e)}")
            return []
    
    def _popularity_based_recommendations(self, student_id: int, limit: int) -> List[Dict]:
        """Popularity-based recommendations as fallback"""
        try:
            # Get student info for department-based recommendations
            student_info = self.db.get_student_info(student_id)
            
            # Get student's enrolled courses to exclude them
            enrollments = self.db.get_student_enrollments(student_id)
            enrolled_course_ids = enrollments['course_id'].unique() if not enrollments.empty else []
            
            recommendations = []
            
            # Department-based popular courses
            if student_info and student_info.get('department_id'):
                dept_popular = self.db.get_popular_courses_by_department(
                    student_info['department_id'], limit * 2
                )
                for course_id in dept_popular:
                    if course_id not in enrolled_course_ids:
                        recommendations.append((course_id, 0.8))  # High popularity score
            
            # Trending courses
            trending = self.db.get_trending_courses(limit=limit)
            for course_id in trending:
                if course_id not in enrolled_course_ids:
                    recommendations.append((course_id, 0.6))  # Medium trending score
            
            # Remove duplicates and sort
            unique_recs = list(dict(recommendations).items())
            sorted_recs = sorted(unique_recs, key=lambda x: x[1], reverse=True)
            
            return self._format_recommendations(sorted_recs[:limit], "popularity", student_id)
            
        except Exception as e:
            logger.error(f"Popularity-based filtering error: {str(e)}")
            return []
    
    def _get_course_similarity_matrix(self, user_course_matrix: pd.DataFrame) -> pd.DataFrame:
        """Calculate or retrieve cached course similarity matrix"""
        cache_key = "course_similarity_matrix"
        
        # Check cache
        cached_matrix = self._get_from_cache(cache_key)
        if cached_matrix:
            return pd.DataFrame(cached_matrix)
        
        # Calculate similarity matrix
        logger.info("Calculating course similarity matrix")
        
        # Use cosine similarity on transposed matrix (courses as rows)
        course_similarity = cosine_similarity(user_course_matrix.T)
        
        similarity_df = pd.DataFrame(
            course_similarity,
            index=user_course_matrix.columns,
            columns=user_course_matrix.columns
        )
        
        # Cache the matrix
        self._set_cache(cache_key, similarity_df.to_dict(), self.similarity_matrix_ttl)
        
        return similarity_df
    
    def _extract_course_features(self, courses_df: pd.DataFrame) -> Dict[int, Dict]:
        """Extract features from course data for content-based filtering"""
        features = {}
        
        # Prepare text data for TF-IDF
        course_texts = []
        course_ids = []
        
        for _, course in courses_df.iterrows():
            # Combine title and description
            text = f"{course.get('title', '')} {course.get('description', '')}"
            course_texts.append(text)
            course_ids.append(course['id'])
        
        # Calculate TF-IDF features
        if course_texts:
            vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(course_texts)
            
            for i, course_id in enumerate(course_ids):
                features[course_id] = {
                    'tfidf_features': tfidf_matrix[i].toarray().flatten(),
                    'department_id': courses_df.iloc[i].get('department_id', 0),
                    'credits': courses_df.iloc[i].get('credits', 0),
                    'difficulty_level': courses_df.iloc[i].get('difficulty_level', 'medium')
                }
        
        return features
    
    def _calculate_student_preferences(self, enrolled_course_ids: List[int], course_features: Dict) -> Dict:
        """Calculate student preferences based on enrolled courses"""
        if not enrolled_course_ids:
            return {}
        
        # Average TF-IDF features of enrolled courses
        tfidf_features = []
        departments = []
        credits = []
        
        for course_id in enrolled_course_ids:
            if course_id in course_features:
                features = course_features[course_id]
                tfidf_features.append(features['tfidf_features'])
                departments.append(features['department_id'])
                credits.append(features['credits'])
        
        preferences = {}
        if tfidf_features:
            preferences['tfidf_profile'] = np.mean(tfidf_features, axis=0)
            preferences['preferred_department'] = max(set(departments), key=departments.count) if departments else None
            preferences['preferred_credits'] = np.mean(credits) if credits else 0
        
        return preferences
    
    def _calculate_content_similarity(self, student_preferences: Dict, course_features: Dict) -> float:
        """Calculate similarity between student preferences and course features"""
        similarity = 0.0
        
        # TF-IDF similarity
        if 'tfidf_profile' in student_preferences and 'tfidf_features' in course_features:
            tfidf_sim = cosine_similarity(
                [student_preferences['tfidf_profile']],
                [course_features['tfidf_features']]
            )[0][0]
            similarity += tfidf_sim * 0.7  # 70% weight for content similarity
        
        # Department similarity
        if student_preferences.get('preferred_department') == course_features.get('department_id'):
            similarity += 0.2  # 20% weight for department match
        
        # Credits similarity (normalized)
        if student_preferences.get('preferred_credits', 0) > 0:
            credits_diff = abs(student_preferences['preferred_credits'] - course_features.get('credits', 0))
            credits_sim = max(0, 1 - credits_diff / 10)  # Normalize to 0-1
            similarity += credits_sim * 0.1  # 10% weight for credits similarity
        
        return similarity
    
    def _combine_recommendations(self, collab_recs: List[Dict], content_recs: List[Dict], 
                               popular_recs: List[Dict], limit: int) -> List[Dict]:
        """Combine recommendations from different strategies"""
        
        # Weighted combination of scores
        weights = {
            'collaborative': 0.5,
            'content': 0.3,
            'popularity': 0.2
        }
        
        combined_scores = {}
        
        # Process each recommendation type
        for recs, strategy in [(collab_recs, 'collaborative'), (content_recs, 'content'), (popular_recs, 'popularity')]:
            for rec in recs:
                course_id = rec['course_id']
                score = rec['score'] * weights[strategy]
                
                if course_id in combined_scores:
                    combined_scores[course_id]['score'] += score
                    combined_scores[course_id]['strategies'].append(strategy)
                else:
                    combined_scores[course_id] = {
                        'score': score,
                        'strategies': [strategy],
                        'original_rec': rec
                    }
        
        # Sort by combined score and format final recommendations
        sorted_combined = sorted(combined_scores.items(), key=lambda x: x[1]['score'], reverse=True)
        
        final_recommendations = []
        for course_id, data in sorted_combined[:limit]:
            rec = data['original_rec'].copy()
            rec['score'] = data['score']
            rec['strategies'] = data['strategies']
            rec['reason'] = self._generate_recommendation_reason(rec, data['strategies'])
            final_recommendations.append(rec)
        
        return final_recommendations
    
    def _format_recommendations(self, scored_courses: List[Tuple], strategy: str, student_id: int) -> List[Dict]:
        """Format recommendations with course details"""
        if not scored_courses:
            return []
        
        # Get course details
        course_ids = [course_id for course_id, _ in scored_courses]
        courses_df = self.db.get_all_courses()
        
        recommendations = []
        for course_id, score in scored_courses:
            course_info = courses_df[courses_df['id'] == course_id]
            
            if not course_info.empty:
                course = course_info.iloc[0]
                recommendations.append({
                    'course_id': int(course_id),
                    'title': course['title'],
                    'description': course.get('description', 'No description available'),
                    'department_name': course.get('department_name', 'Unknown'),
                    'instructor_name': course.get('instructor_name', 'TBA'),
                    'credits': course.get('credits', 0),
                    'difficulty_level': course.get('difficulty_level', 'medium'),
                    'score': float(score),
                    'strategy': strategy
                })
        
        return recommendations
    
    def _generate_recommendation_reason(self, rec: Dict, strategies: List[str]) -> str:
        """Generate explanation for why this course was recommended"""
        reasons = []
        
        if 'collaborative' in strategies:
            reasons.append("students with similar interests also took this course")
        
        if 'content' in strategies:
            reasons.append("matches your learning preferences")
        
        if 'popularity' in strategies:
            reasons.append("popular among students in your department")
        
        if reasons:
            return f"Recommended because {' and '.join(reasons)}"
        else:
            return "Based on your learning history"
    
    def rebuild_similarity_matrix(self) -> None:
        """Rebuild the course similarity matrix (for retraining)"""
        try:
            # Clear similarity matrix cache
            if self.redis:
                self.redis.delete("course_similarity_matrix")
            
            # Recalculate matrix
            user_course_matrix = self.db.get_user_course_matrix()
            if not user_course_matrix.empty:
                self._get_course_similarity_matrix(user_course_matrix)
                logger.info("Course similarity matrix rebuilt successfully")
            else:
                logger.warning("No data available for rebuilding similarity matrix")
                
        except Exception as e:
            logger.error(f"Error rebuilding similarity matrix: {str(e)}")
            raise
    
    def clear_cache(self) -> None:
        """Clear all recommendation caches"""
        if self.redis:
            # Get all recommendation-related keys
            keys = self.redis.keys("*")
            if keys:
                self.redis.delete(*keys)
                logger.info(f"Cleared {len(keys)} cache entries")
    
    def get_stats(self) -> Dict:
        """Get recommendation engine statistics"""
        try:
            # Database stats
            user_course_matrix = self.db.get_user_course_matrix()
            course_stats = self.db.get_course_statistics()
            
            stats = {
                'total_students': len(user_course_matrix.index) if not user_course_matrix.empty else 0,
                'total_courses': len(user_course_matrix.columns) if not user_course_matrix.empty else 0,
                'total_interactions': user_course_matrix.sum().sum() if not user_course_matrix.empty else 0,
                'avg_courses_per_student': user_course_matrix.sum(axis=1).mean() if not user_course_matrix.empty else 0,
                'sparsity': (1 - user_course_matrix.astype(bool).sum().sum() / user_course_matrix.size) if not user_course_matrix.empty else 0,
                'cache_enabled': self.redis is not None
            }
            
            if not course_stats.empty:
                stats.update({
                    'avg_enrollment_per_course': course_stats['total_enrollments'].mean(),
                    'avg_completion_rate': course_stats['completion_rate'].mean()
                })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting stats: {str(e)}")
            return {'error': str(e)}
