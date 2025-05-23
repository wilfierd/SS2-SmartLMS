// src/hooks/useCourse.js - Custom hooks for course management
import { useState, useEffect, useCallback } from 'react';
import courseService from '../services/courseService';
import notification from '../utils/notification';

// Hook for managing course data
export const useCourse = (courseId) => {
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCourse = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const courseData = await courseService.getCourse(courseId);
      setCourse(courseData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load course details');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  const updateCourse = async (courseData) => {
    try {
      await courseService.updateCourse(courseId, courseData);
      await fetchCourse(); // Refresh data
      notification.success('Course updated successfully');
    } catch (err) {
      notification.error('Failed to update course');
      throw err;
    }
  };

  return {
    course,
    isLoading,
    error,
    refetch: fetchCourse,
    updateCourse
  };
};

// Hook for managing course modules
export const useCourseModules = (courseId) => {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModules = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const modulesData = await courseService.getModules(courseId);
      setModules(modulesData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load course modules');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const createModule = async (moduleData) => {
    try {
      await courseService.createModule(courseId, moduleData);
      await fetchModules(); // Refresh data
      notification.success('Module created successfully');
    } catch (err) {
      notification.error('Failed to create module');
      throw err;
    }
  };

  const updateModule = async (moduleId, moduleData) => {
    try {
      await courseService.updateModule(courseId, moduleId, moduleData);
      await fetchModules(); // Refresh data
      notification.success('Module updated successfully');
    } catch (err) {
      notification.error('Failed to update module');
      throw err;
    }
  };

  const deleteModule = async (moduleId) => {
    try {
      await courseService.deleteModule(courseId, moduleId);
      await fetchModules(); // Refresh data
      notification.success('Module deleted successfully');
    } catch (err) {
      notification.error('Failed to delete module');
      throw err;
    }
  };

  return {
    modules,
    isLoading,
    error,
    refetch: fetchModules,
    createModule,
    updateModule,
    deleteModule
  };
};

// Hook for managing course assignments
export const useCourseAssignments = (courseId) => {
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssignments = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const assignmentsData = await courseService.getAssignments(courseId);
      setAssignments(assignmentsData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const createAssignment = async (assignmentData) => {
    try {
      await courseService.createAssignment(courseId, assignmentData);
      await fetchAssignments(); // Refresh data
      notification.success('Assignment created successfully');
    } catch (err) {
      notification.error('Failed to create assignment');
      throw err;
    }
  };

  const submitAssignment = async (assignmentId, submissionData) => {
    try {
      await courseService.submitAssignment(assignmentId, submissionData);
      await fetchAssignments(); // Refresh data
      notification.success('Assignment submitted successfully');
    } catch (err) {
      notification.error('Failed to submit assignment');
      throw err;
    }
  };

  return {
    assignments,
    isLoading,
    error,
    refetch: fetchAssignments,
    createAssignment,
    submitAssignment
  };
};

// Hook for managing course quizzes
export const useCourseQuizzes = (courseId) => {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuizzes = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const quizzesData = await courseService.getQuizzes(courseId);
      setQuizzes(quizzesData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load quizzes');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const createQuiz = async (quizData) => {
    try {
      await courseService.createQuiz(courseId, quizData);
      await fetchQuizzes(); // Refresh data
      notification.success('Quiz created successfully');
    } catch (err) {
      notification.error('Failed to create quiz');
      throw err;
    }
  };

  return {
    quizzes,
    isLoading,
    error,
    refetch: fetchQuizzes,
    createQuiz
  };
};

// Hook for managing course discussions
export const useCourseDiscussions = (courseId) => {
  const [discussions, setDiscussions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDiscussions = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const discussionsData = await courseService.getDiscussions(courseId);
      setDiscussions(discussionsData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load discussions');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  const createDiscussion = async (discussionData) => {
    try {
      await courseService.createDiscussion(courseId, discussionData);
      await fetchDiscussions(); // Refresh data
      notification.success('Discussion created successfully');
    } catch (err) {
      notification.error('Failed to create discussion');
      throw err;
    }
  };

  return {
    discussions,
    isLoading,
    error,
    refetch: fetchDiscussions,
    createDiscussion
  };
};

// Hook for managing course enrollment
export const useCourseEnrollment = (courseId) => {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkEnrollmentStatus = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const enrolled = await courseService.checkEnrollmentStatus(courseId);
      setIsEnrolled(enrolled);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    checkEnrollmentStatus();
  }, [checkEnrollmentStatus]);

  const enrollInCourse = async (enrollmentKey = null) => {
    try {
      await courseService.enrollInCourse(courseId, enrollmentKey);
      setIsEnrolled(true);
      notification.success('Successfully enrolled in course');
    } catch (err) {
      notification.error('Failed to enroll in course');
      throw err;
    }
  };

  const leaveCourse = async () => {
    try {
      await courseService.leaveCourse(courseId);
      setIsEnrolled(false);
      notification.success('Successfully left the course');
    } catch (err) {
      notification.error('Failed to leave course');
      throw err;
    }
  };

  return {
    isEnrolled,
    isLoading,
    error,
    enrollInCourse,
    leaveCourse,
    refetch: checkEnrollmentStatus
  };
};

// Hook for managing course students (instructors only)
export const useCourseStudents = (courseId) => {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudents = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const studentsData = await courseService.getEnrolledStudents(courseId);
      setStudents(studentsData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const submitFeedback = async (studentId, feedback) => {
    try {
      await courseService.submitStudentFeedback(courseId, {
        studentId,
        feedback
      });
      notification.success('Feedback submitted successfully');
    } catch (err) {
      notification.error('Failed to submit feedback');
      throw err;
    }
  };

  return {
    students,
    isLoading,
    error,
    refetch: fetchStudents,
    submitFeedback
  };
};

// Hook for managing course statistics
export const useCourseStatistics = (courseId) => {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatistics = useCallback(async () => {
    if (!courseId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const statsData = await courseService.getCourseStatistics(courseId);
      setStatistics(statsData);
    } catch (err) {
      setError(err.message);
      notification.error('Failed to load course statistics');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    refetch: fetchStatistics
  };
};

// Combined hook for all course data
// Combined hook for all course data with role-based loading
export const useCourseData = (courseId, userRole = null, authLoading = false) => {
  const course = useCourse(courseId);
  const modules = useCourseModules(courseId);
  const assignments = useCourseAssignments(courseId);
  const quizzes = useCourseQuizzes(courseId);
  const discussions = useCourseDiscussions(courseId);
  const enrollment = useCourseEnrollment(courseId);
  
  // Pass userRole and authLoading to hooks that need permission checking
  const students = useCourseStudents(courseId, userRole, authLoading);
  const statistics = useCourseStatistics(courseId, userRole, authLoading);

  const isLoading = course.isLoading || modules.isLoading || assignments.isLoading || quizzes.isLoading;
  const hasError = course.error || modules.error || assignments.error || quizzes.error;

  const canViewStudentData = userRole === 'instructor' || userRole === 'admin';

  const refetchAll = async () => {
    const promises = [
      course.refetch(),
      modules.refetch(),
      assignments.refetch(),
      quizzes.refetch(),
      discussions.refetch(),
      enrollment.refetch()
    ];
    
    // Only refetch instructor data if user has permission and auth is ready
    if (canViewStudentData && !authLoading) {
      promises.push(students.refetch());
      promises.push(statistics.refetch());
    }
    
    await Promise.all(promises);
  };

  return {
    course,
    modules,
    assignments,
    quizzes,
    discussions,
    enrollment,
    students,
    statistics,
    isLoading,
    hasError,
    refetchAll,
    canViewStudentData
  };
};