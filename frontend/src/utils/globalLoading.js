// Global loading system - Extract text for CSS pseudo-elements
export const initGlobalLoading = () => {
  // Function to extract text content and set as data-text for CSS
  const processLoadingDivs = () => {
    const loadingDivs = document.querySelectorAll('.loading-spinner:not([data-processed])');
    
    loadingDivs.forEach(div => {
      // Extract text content
      const text = div.textContent.trim();
      if (text && text !== 'Loading...') {
        div.setAttribute('data-text', text);
      }
      
      // Mark as processed
      div.setAttribute('data-processed', 'true');
    });
  };

  // Run on DOM mutations
  const observer = new MutationObserver(() => {
    processLoadingDivs();
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial processing
  setTimeout(processLoadingDivs, 100);
  
  console.log('Global loading system initialized - Pure CSS with text extraction');
  return observer;
};

// Global loading state manager
class GlobalLoadingManager {
  constructor() {
    this.activeLoadings = new Set();
    this.pageLoading = false;
  }

  // Show section loading anywhere
  showLoading(containerId, text = 'Loading...') {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<div class="auto-loading" data-text="${text}"></div>`;
      this.activeLoadings.add(containerId);
    }
  }

  // Hide loading
  hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const loadingDiv = container.querySelector('.auto-loading');
      if (loadingDiv) {
        loadingDiv.remove();
      }
      this.activeLoadings.delete(containerId);
    }
  }

  // Show page loading
  showPageLoading(text = 'Loading...') {
    if (this.pageLoading) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'global-page-loading';
    overlay.innerHTML = `<div class="page-loading-content" data-text="${text}"></div>`;
    document.body.appendChild(overlay);
    this.pageLoading = true;
  }

  // Hide page loading
  hidePageLoading() {
    const overlay = document.getElementById('global-page-loading');
    if (overlay) {
      overlay.remove();
      this.pageLoading = false;
    }
  }
}

// Create global instance
export const globalLoading = new GlobalLoadingManager();

// Make it available globally
if (typeof window !== 'undefined') {
  window.globalLoading = globalLoading;
  window.showLoading = (id, text) => globalLoading.showLoading(id, text);
  window.hideLoading = (id) => globalLoading.hideLoading(id);
  window.showPageLoading = (text) => globalLoading.showPageLoading(text);
  window.hidePageLoading = () => globalLoading.hidePageLoading();
} 