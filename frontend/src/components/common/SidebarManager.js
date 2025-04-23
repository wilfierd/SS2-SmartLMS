// src/utils/SidebarManager.js

/**
 * Utility class to manage sidebar state across components
 */
class SidebarManager {
    // Get current sidebar state
    static isExpanded() {
      return localStorage.getItem('sidebarExpanded') === 'true';
    }
  
    // Toggle sidebar state
    static toggle() {
      const currentState = this.isExpanded();
      const newState = !currentState;
      
      // Update localStorage
      localStorage.setItem('sidebarExpanded', newState);
      
      // Update body class
      if (newState) {
        document.body.classList.add('sidebar-expanded');
      } else {
        document.body.classList.remove('sidebar-expanded');
      }
      
      // Dispatch custom event
      const event = new CustomEvent('sidebarStateChanged', { detail: { expanded: newState } });
      window.dispatchEvent(event);
      
      // Also dispatch a storage event to help components that listen for it
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sidebarExpanded',
        newValue: String(newState),
        url: window.location.href
      }));
      
      return newState;
    }
  
    // Set specific state 
    static setExpanded(expanded) {
      if (expanded === this.isExpanded()) return; // No change needed
      
      // Update localStorage
      localStorage.setItem('sidebarExpanded', expanded);
      
      // Update body class
      if (expanded) {
        document.body.classList.add('sidebar-expanded');
      } else {
        document.body.classList.remove('sidebar-expanded');
      }
      
      // Dispatch custom event
      const event = new CustomEvent('sidebarStateChanged', { detail: { expanded } });
      window.dispatchEvent(event);
      
      // Also dispatch a storage event to help components that listen for it
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sidebarExpanded',
        newValue: String(expanded),
        url: window.location.href
      }));
    }
  
    // Initialize sidebar state from localStorage on page load
    static initialize() {
      const expanded = localStorage.getItem('sidebarExpanded') === 'true';
      
      if (expanded) {
        document.body.classList.add('sidebar-expanded');
      } else {
        document.body.classList.remove('sidebar-expanded');
      }
      
      // Add event listener for mobile
      const isMobile = window.innerWidth <= 768;
      if (isMobile && expanded) {
        // Close sidebar on mobile by default
        this.setExpanded(false);
      }
      
      // Listen for page navigation if using client-side routing
      window.addEventListener('popstate', () => {
        if (isMobile && this.isExpanded()) {
          this.setExpanded(false);
        }
      });
    }
  }
  
  export default SidebarManager;