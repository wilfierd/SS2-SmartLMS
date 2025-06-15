# recommender_utils.py

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def prepare_course_features(courses_df):
    courses_df['description'] = courses_df['description'].fillna('')
    courses_df['department_name'] = courses_df['department_name'].fillna('General')
    courses_df['text_features'] = (
        courses_df['title'] + ' ' + 
        courses_df['description'] + ' ' + 
        courses_df['department_name']
    )
    tfidf = TfidfVectorizer(max_features=1000, stop_words='english')
    course_features = tfidf.fit_transform(courses_df['text_features'])
    return course_features, tfidf

def create_interaction_matrix(enrollments_df, submissions_df):
    status_map = {'not_started': 1, 'in_progress': 2, 'completed': 3}
    enrollments_df['completion_numeric'] = enrollments_df['completion_status'].map(status_map)
    user_course_matrix = enrollments_df.pivot_table(
        index='student_id', 
        columns='course_id', 
        values='completion_numeric',
        aggfunc='max',
        fill_value=0
    )
    if not submissions_df.empty:
        avg_grades = submissions_df.groupby(['student_id', 'course_id'])['grade'].mean().reset_index()
        for _, row in avg_grades.iterrows():
            student_id, course_id, grade = row['student_id'], row['course_id'], row['grade']
            if student_id in user_course_matrix.index and course_id in user_course_matrix.columns:
                user_course_matrix.loc[student_id, course_id] += grade / 20
    return user_course_matrix

def collaborative_filtering(user_course_matrix, target_student_id, n_recommendations=5):
    if target_student_id not in user_course_matrix.index:
        return []
    user_similarity = cosine_similarity(user_course_matrix)
    user_similarity_df = pd.DataFrame(user_similarity, index=user_course_matrix.index, columns=user_course_matrix.index)
    similar_users = user_similarity_df[target_student_id].sort_values(ascending=False)[1:11]
    target_user_courses = set(user_course_matrix.loc[target_student_id][user_course_matrix.loc[target_student_id] > 0].index)
    recommendations = {}
    for similar_user, similarity_score in similar_users.items():
        similar_user_courses = user_course_matrix.loc[similar_user]
        for course_id, rating in similar_user_courses.items():
            if course_id not in target_user_courses and rating > 1:
                recommendations[course_id] = recommendations.get(course_id, 0) + similarity_score * rating
    sorted_recommendations = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
    return [course_id for course_id, _ in sorted_recommendations[:n_recommendations]]

def content_based_filtering(course_features, user_course_matrix, courses_df, target_student_id, n_recommendations=5):
    if target_student_id not in user_course_matrix.index:
        return []
    user_courses = user_course_matrix.loc[target_student_id]
    enrolled_courses = user_courses[user_courses > 0].index.tolist()
    if not enrolled_courses:
        return []
    course_similarity = cosine_similarity(course_features)
    similar_courses = {}
    for enrolled_course in enrolled_courses:
        if enrolled_course in courses_df['id'].values:
            course_idx = courses_df[courses_df['id'] == enrolled_course].index[0]
            similarities = course_similarity[course_idx]
            for idx, similarity_score in enumerate(similarities):
                course_id = courses_df.iloc[idx]['id']
                if course_id not in enrolled_courses:
                    similar_courses[course_id] = similar_courses.get(course_id, 0) + similarity_score
    sorted_recommendations = sorted(similar_courses.items(), key=lambda x: x[1], reverse=True)
    return [course_id for course_id, _ in sorted_recommendations[:n_recommendations]]

def hybrid_recommendations(user_course_matrix, course_features, courses_df, enrollments_df, target_student_id, n_recommendations=3):
    cf_recs = collaborative_filtering(user_course_matrix, target_student_id, n_recommendations)
    cb_recs = content_based_filtering(course_features, user_course_matrix, courses_df, target_student_id, n_recommendations)
    all_recommendations = list(set(cf_recs + cb_recs))
    if len(all_recommendations) < n_recommendations:
        enrolled_courses = set(user_course_matrix.loc[target_student_id][user_course_matrix.loc[target_student_id] > 0].index) if target_student_id in user_course_matrix.index else set()
        popular_courses = enrollments_df['course_id'].value_counts().head(10).index.tolist()
        for course_id in popular_courses:
            if course_id not in enrolled_courses and course_id not in all_recommendations:
                all_recommendations.append(course_id)
                if len(all_recommendations) >= n_recommendations:
                    break
    return all_recommendations[:n_recommendations]
