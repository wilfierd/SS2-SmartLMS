# ai/recommend.py
# Script đề xuất khóa học dựa trên mô hình đã huấn luyện

import pickle
import pandas as pd
import numpy as np
import sys
import os
import json

def load_model(model_path='recommendation_model.pkl'):
    """Tải mô hình đề xuất"""
    try:
        print(f"Đang tải mô hình từ: {model_path}")
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        print(f"Tải mô hình thành công")
        return model
    except Exception as e:
        print(f"Lỗi khi tải mô hình: {str(e)}")
        return None

def get_course_recommendations(student_id, model, n=3):
    """Lấy đề xuất khóa học cho sinh viên"""
    # Giải nén các thành phần của mô hình
    user_course_matrix = model['user_course_matrix']
    course_similarity_df = model['course_similarity_matrix']
    courses_df = model['courses']
    
    # Kiểm tra xem sinh viên có tồn tại trong ma trận không
    if student_id not in user_course_matrix.index:
        return [{"error": f"Sinh viên {student_id} không có trong dữ liệu huấn luyện"}]
    
    # Lấy các khóa học mà sinh viên đã tương tác
    student_courses = user_course_matrix.loc[student_id]
    enrolled_courses = student_courses[student_courses > 0].index.tolist()
    
    # Tính điểm đề xuất cho tất cả khóa học
    recommendation_scores = {}
    
    for course_id in user_course_matrix.columns:
        # Bỏ qua các khóa học mà sinh viên đã đăng ký
        if course_id in enrolled_courses:
            continue
            
        # Tính điểm dựa trên các khóa học tương tự
        score = 0
        for enrolled_course in enrolled_courses:
            # Đảm bảo cả hai khóa học đều tồn tại trong ma trận tương đồng
            if enrolled_course in course_similarity_df.index and course_id in course_similarity_df.columns:
                similarity = course_similarity_df.loc[enrolled_course, course_id]
                interaction = student_courses[enrolled_course]
                score += similarity * interaction
        
        if score > 0:  # Chỉ bao gồm khóa học có điểm dương
            recommendation_scores[course_id] = score
    
    # Sắp xếp khóa học theo điểm đề xuất
    sorted_recommendations = sorted(recommendation_scores.items(), key=lambda x: x[1], reverse=True)
    
    # Xử lý trường hợp không tìm thấy đề xuất
    if not sorted_recommendations:
        return [{"error": f"Không tìm thấy đề xuất cho sinh viên {student_id}"}]
    
    # Chuẩn bị kết quả
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
            # Khóa học tồn tại trong ma trận nhưng không có trong courses_df
            results.append({
                'course_id': int(course_id),
                'score': float(score),
                'title': f"Khóa học {course_id}",
                'description': "Không có mô tả",
                'reason': "Dựa trên lịch sử học tập của bạn"
            })
    
    return results

def get_recommendation_reason(student_id, recommended_course_id, enrolled_courses, course_similarity_df, courses_df):
    """Tạo lý do đề xuất cho khóa học"""
    # Tìm khóa học đã đăng ký tương tự nhất
    most_similar_course_id = None
    highest_similarity = -1
    
    for enrolled_course in enrolled_courses:
        # Đảm bảo cả hai khóa học đều tồn tại trong ma trận tương đồng
        if enrolled_course in course_similarity_df.index and recommended_course_id in course_similarity_df.columns:
            similarity = course_similarity_df.loc[enrolled_course, recommended_course_id]
            if similarity > highest_similarity:
                highest_similarity = similarity
                most_similar_course_id = enrolled_course
    
    if most_similar_course_id is not None and highest_similarity > 0.3:
        similar_course = courses_df[courses_df['id'] == most_similar_course_id]
        if len(similar_course) > 0:
            return f"Tương tự với '{similar_course.iloc[0]['title']}' mà bạn đã học"
    
    # Các lý do chung nếu không tìm thấy lý do cụ thể
    reasons = [
        "Dựa trên lịch sử học tập của bạn",
        "Phổ biến trong số sinh viên có sở thích tương tự",
        "Bổ sung cho kỹ năng hiện tại của bạn",
        "Sẽ giúp bạn mở rộng kiến thức"
    ]
    return np.random.choice(reasons)

def create_test_model():
    """Tạo mô hình thử nghiệm đơn giản nếu không thể tải mô hình thực"""
    print("Đang tạo dữ liệu mô hình thử nghiệm...")
    
    # Tạo dữ liệu tổng hợp
    student_ids = [9, 10, 11, 12, 13]
    course_ids = [1, 2, 3, 4, 5, 6, 7]
    
    # Tạo ma trận người dùng-khóa học
    data = []
    for student_id in student_ids:
        # Mỗi sinh viên đăng ký 2-3 khóa học
        enrolled_courses = np.random.choice(course_ids, size=np.random.randint(2, 4), replace=False)
        for course_id in enrolled_courses:
            status = np.random.choice(['completed', 'in_progress', 'not_started'], p=[0.5, 0.3, 0.2])
            data.append({
                'student_id': student_id,
                'course_id': course_id,
                'completion_status': status
            })
    
    enrollments_df = pd.DataFrame(data)
    
    # Ánh xạ trạng thái hoàn thành sang giá trị số
    status_map = {
        'completed': 1.0,
        'in_progress': 0.5,
        'not_started': 0.2
    }
    
    # Chuyển đổi trạng thái hoàn thành thành giá trị số
    enrollments_df['interaction_strength'] = enrollments_df['completion_status'].map(status_map)
    
    # Tạo ma trận người dùng-khóa học
    user_course_matrix = enrollments_df.pivot_table(
        index='student_id',
        columns='course_id',
        values='interaction_strength',
        fill_value=0
    )
    
    # Tạo ma trận tương đồng khóa học
    course_similarity = np.random.rand(len(course_ids), len(course_ids))
    # Làm cho nó đối xứng
    course_similarity = (course_similarity + course_similarity.T) / 2
    # Đặt đường chéo bằng 1
    np.fill_diagonal(course_similarity, 1)
    
    course_similarity_df = pd.DataFrame(
        course_similarity,
        index=course_ids,
        columns=course_ids
    )
    
    # Tạo dữ liệu khóa học
    courses_data = []
    for course_id in course_ids:
        courses_data.append({
            'id': course_id,
            'title': f'Khóa học mẫu {course_id}',
            'description': f'Mô tả cho khóa học mẫu {course_id}',
            'department_id': np.random.randint(1, 4)
        })
    
    courses_df = pd.DataFrame(courses_data)
    
    # Tạo gói mô hình
    recommendation_model = {
        'user_course_matrix': user_course_matrix,
        'course_similarity_matrix': course_similarity_df,
        'courses': courses_df
    }
    
    return recommendation_model

def main():
    """Hàm chính để kiểm tra chức năng đề xuất"""
    if len(sys.argv) < 2:
        print("Cách sử dụng: python recommend.py <student_id> [num_recommendations] [model_path]")
        return
    
    # Phân tích tham số
    student_id = int(sys.argv[1])
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    model_path = sys.argv[3] if len(sys.argv) > 3 else 'recommendation_model.pkl'
    
    # Tải mô hình
    model = load_model(model_path)
    if model is None:
        print("Không thể tải mô hình, đang thử tạo mô hình thử nghiệm...")
        model = create_test_model()
        if model is None:
            print("Không thể tạo mô hình thử nghiệm")
            return
    
    # Lấy đề xuất
    recommendations = get_course_recommendations(student_id, model, n)
    
    # In kết quả dưới dạng JSON
    # Điều này đảm bảo phân tích cú pháp đúng trong dịch vụ Node.js
    print("\nRECOMMENDATION_START_JSON")
    print(json.dumps(recommendations))
    print("RECOMMENDATION_END_JSON")
    
    # In kết quả ở định dạng thân thiện với người đọc
    print(f"\nTop {len(recommendations)} khóa học đề xuất cho sinh viên {student_id}:")
    for i, rec in enumerate(recommendations, 1):
        if "error" in rec:
            print(rec["error"])
            continue
            
        print(f"{i}. {rec['title']} (ID: {rec['course_id']}, Điểm: {rec['score']:.2f})")
        print(f"   Lý do: {rec['reason']}")
        print(f"   Mô tả: {rec['description']}")
        print("---")

if __name__ == "__main__":
    main()