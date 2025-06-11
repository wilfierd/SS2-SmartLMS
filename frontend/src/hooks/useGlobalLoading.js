import { useCallback } from 'react';

// Hook for easy global loading - no imports needed!
export const useGlobalLoading = () => {
  const showLoading = useCallback((containerId, text = 'Loading...') => {
    if (typeof window !== 'undefined' && window.showLoading) {
      window.showLoading(containerId, text);
    }
  }, []);

  const hideLoading = useCallback((containerId) => {
    if (typeof window !== 'undefined' && window.hideLoading) {
      window.hideLoading(containerId);
    }
  }, []);

  const showPageLoading = useCallback((text = 'Loading...') => {
    if (typeof window !== 'undefined' && window.showPageLoading) {
      window.showPageLoading(text);
    }
  }, []);

  const hidePageLoading = useCallback(() => {
    if (typeof window !== 'undefined' && window.hidePageLoading) {
      window.hidePageLoading();
    }
  }, []);

  return {
    showLoading,
    hideLoading,
    showPageLoading,
    hidePageLoading
  };
};

// Even simpler - direct functions available globally
export const showLoading = (containerId, text = 'Loading...') => {
  if (typeof window !== 'undefined' && window.showLoading) {
    window.showLoading(containerId, text);
  }
};

export const hideLoading = (containerId) => {
  if (typeof window !== 'undefined' && window.hideLoading) {
    window.hideLoading(containerId);
  }
};

export const showPageLoading = (text = 'Loading...') => {
  if (typeof window !== 'undefined' && window.showPageLoading) {
    window.showPageLoading(text);
  }
};

export const hidePageLoading = () => {
  if (typeof window !== 'undefined' && window.hidePageLoading) {
    window.hidePageLoading();
  }
};

export default useGlobalLoading; 