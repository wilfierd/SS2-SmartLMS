// Common components exports for easy importing
export { default as Sidebar } from './Sidebar';
export { default as Header } from './Header';
export { default as SearchBar } from './SearchBar';
export { default as SidebarManager } from './SidebarManager';
export { default as UnauthorizedPage } from './UnauthorizedPage';

// Global loading is now handled via CSS and global functions
// No component imports needed - just use className="loading-spinner"
// Or use window.showLoading() / window.hideLoading() functions 