import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import config from '../../config';
import AuthContext from '../../context/AuthContext';
import './SearchBar.css';

const SearchBar = ({ 
  onResultSelect, 
  placeholder = "Search courses, discussions...",
  className = "",
  compact = false 
}) => {
  const { auth } = useContext(AuthContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    instructor: '',
    type: '',
    difficulty: ''
  });
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    instructors: [],
    contentTypes: [],
    difficulties: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query, filters]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadFilterOptions = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/search/filters`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10'
      });

      // Add active filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await axios.get(`${config.apiUrl}/search?${params}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      setResults(response.data.results || []);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      department: '',
      instructor: '',
      type: '',
      difficulty: ''
    });
  };

  const handleResultClick = (result) => {
    setShowResults(false);
    setShowFilters(false);
    setQuery('');
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value).length;
  };
  const getResultTypeIcon = (type) => {
    switch (type) {
      case 'course':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        );
      case 'discussion':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        );
      case 'announcement':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V7L6 11H4a1 1 0 0 0-1 1z"/>
            <path d="M13.54 3.46a10 10 0 0 1 0 17.08"/>
            <path d="M16.77 6.69a6 6 0 0 1 0 10.62"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        );
    }
  };

  return (
    <div className={`search-bar-container ${className} ${compact ? 'compact' : ''}`} ref={searchRef}>      <div className="search-input-wrapper">
        <div className="search-input-container">
          <span className="search-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="search-input"
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
          />
          {loading && (
            <div className="search-loading">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinning">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          )}
        </div>
          {!compact && (
          <div className="filter-container">            <button 
              className={`filter-toggle ${getActiveFilterCount() > 0 ? 'has-filters' : ''} ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              title="Search Filters"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M7 12h10m-7 6h4"/>
              </svg>
              <span className="filter-text">Filters</span>
              {getActiveFilterCount() > 0 && (
                <span className="filter-count">{getActiveFilterCount()}</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && !compact && (
        <div className="search-filters">
          <div className="filters-header">
            <h4>Search Filters</h4>
            <button onClick={clearFilters} className="clear-filters">Clear All</button>
          </div>
            <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Content Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">All Content Types</option>
                {filterOptions.contentTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Department</label>
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="">All Departments</option>
                {filterOptions.departments.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label className="filter-label">Instructor</label>
              <select
                value={filters.instructor}
                onChange={(e) => handleFilterChange('instructor', e.target.value)}
              >
                <option value="">All Instructors</option>
                {filterOptions.instructors.map((instructor, index) => (
                  <option key={index} value={instructor.value}>{instructor.label}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              >
                <option value="">All Difficulties</option>
                {filterOptions.difficulties.map(diff => (
                  <option key={diff.value} value={diff.value}>{diff.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="search-results">
          {results.length > 0 ? (
            <>
              <div className="results-header">
                Found {results.length} results for "{query}"
              </div>
              {results.map((result) => (
                <div 
                  key={result.id} 
                  className="search-result-item"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="result-header">
                    <span className="result-type-icon">{getResultTypeIcon(result.type)}</span>
                    <span className="result-type">{result.type}</span>
                  </div>
                  
                  <div 
                    className="result-title" 
                    dangerouslySetInnerHTML={{ 
                      __html: result._formatted?.title || result.title 
                    }} 
                  />
                  
                  <div 
                    className="result-content" 
                    dangerouslySetInnerHTML={{ 
                      __html: result._formatted?.content || result.content 
                    }} 
                  />
                    <div className="result-meta">
                    {result.instructor && (
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        {result.instructor}
                      </span>
                    )}
                    {result.department && (
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 21h18"/>
                          <path d="M5 21V7l8-4v18"/>
                          <path d="M19 21V11l-6-4"/>
                        </svg>
                        {result.department}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </>          ) : (
            <div className="no-results">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <p>No results found for "{query}"</p>
              <small>Try adjusting your search terms or filters</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 