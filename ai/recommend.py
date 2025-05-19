# recommend.py
# Simple script to make course recommendations based on a trained model

import pickle
import pandas as pd
import numpy as np
import sys

def load_model(model_path='recommendation_model.pkl'):
    """Load the trained recommendation model"""
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        return model
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return None

def get_course_recommendations(student_id, model, n=3):
    """Get course recommendations for a student"""
    # Unpack model components
    user_course_matrix = model['user_course_matrix']
    course_similarity_df = model['course_similarity_matrix']
    courses_df = model['courses']
    
    # Check if student exists in the matrix
    if student_id not in user_course_matrix.index:
        return [{"error": f"Student {student_id} not found in training data"}]
    
    # Get the courses the student has already interacted with
    student_courses = user_course_matrix.loc[student_id]
    enrolled_courses = student_courses[student_courses > 0].index.tolist()
    
    # Calculate recommendation scores for all courses
    recommendation_scores = {}
    
    for course_id in user_course_matrix.columns:
        # Skip courses the student is already enrolled in
        if course_id in enrolled_courses:
            continue
            
        # Calculate a weighted score based on similar courses
        score = 0
        for enrolled_course in enrolled_courses:
            similarity = course_similarity_df.loc[enrolled_course, course_id]
            interaction = student_courses[enrolled_course]
            score += similarity * interaction
        
        recommendation_scores[course_id] = score
    
    # Sort courses by recommendation score
    sorted_recommendations = sorted(recommendation_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Prepare results
    results = []
    for course_id, score in sorted_recommendations[:n]:
        course_info = courses_df[courses_df['id'] == course_id]
        
        if len(course_info) > 0:
            course = course_info.iloc[0]
            results.append({
                'course_id': int(course_id),
                'score': float(score),
                'title': course['title'],
                'description': course['description'] if 'description' in course else '',
                'reason': get_recommendation_reason(student_id, course_id, enrolled_courses, course_similarity_df, courses_df)
            })
        else:
            # Course exists in matrix but not in courses_df
            results.append({
                'course_id': int(course_id),
                'score': float(score),
                'title': f"Course {course_id}",
                'description': "No description available",
                'reason': "Based on your learning patterns"
            })
    
    return results

def get_recommendation_reason(student_id, recommended_course_id, enrolled_courses, course_similarity_df, courses_df):
    """Generate a reason for recommending this course"""
    # Find the most similar enrolled course
    most_similar_course_id = None
    highest_similarity = -1
    
    for enrolled_course in enrolled_courses:
        similarity = course_similarity_df.loc[enrolled_course, recommended_course_id]
        if similarity > highest_similarity:
            highest_similarity = similarity
            most_similar_course_id = enrolled_course
    
    if most_similar_course_id is not None and highest_similarity > 0.3:
        similar_course = courses_df[courses_df['id'] == most_similar_course_id]
        if len(similar_course) > 0:
            return f"Similar to '{similar_course.iloc[0]['title']}' which you've taken"
    
    # Generic reasons if we can't find a specific one
    reasons = [
        "Based on your learning history",
        "Popular among students with similar interests",
        "Complements your current skillset"
    ]
    return np.random.choice(reasons)

def main():
    """Main function to test recommendation functionality"""
    if len(sys.argv) < 2:
        print("Usage: python recommend.py <student_id> [num_recommendations]")
        return
    
    # Parse arguments
    student_id = int(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    
    # Load model
    model = load_model()
    if model is None:
        return
    
    # Get recommendations
    recommendations = get_course_recommendations(student_id, model, n)
    
    # Print results
    print(f"\nTop {len(recommendations)} course recommendations for student {student_id}:")
    for i, rec in enumerate(recommendations, 1):
        if "error" in rec:
            print(rec["error"])
            continue
            
        print(f"{i}. {rec['title']} (ID: {rec['course_id']}, Score: {rec['score']:.2f})")
        print(f"   Reason: {rec['reason']}")
        print(f"   Description: {rec['description']}")

if __name__ == "__main__":
    main()