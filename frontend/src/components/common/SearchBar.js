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
        return '📚';
      case 'discussion':
        return '💬';
      case 'announcement':
        return '📢';
      default:
        return '📄';
    }
  };

  return (
    <div className={`search-bar-container ${className} ${compact ? 'compact' : ''}`} ref={searchRef}>
      <div className="search-input-wrapper">
        <div className="search-input-container">
          <span className="search-icon">🔍</span>
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
          {loading && <div className="search-loading">Searching...</div>}
        </div>
        
        {!compact && (
          <button 
            className={`filter-toggle ${getActiveFilterCount() > 0 ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Search Filters"
          >
            <span>⚙️</span>
            {getActiveFilterCount() > 0 && (
              <span className="filter-count">{getActiveFilterCount()}</span>
            )}
          </button>
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
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Content Types</option>
              {filterOptions.contentTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

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

          <div className="filter-row">
            <select
              value={filters.instructor}
              onChange={(e) => handleFilterChange('instructor', e.target.value)}
            >
              <option value="">All Instructors</option>
              {filterOptions.instructors.map((instructor, index) => (
                <option key={index} value={instructor.value}>{instructor.label}</option>
              ))}
            </select>

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
                    {result.instructor && <span>👨‍🏫 {result.instructor}</span>}
                    {result.department && <span>🏢 {result.department}</span>}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="no-results">
              <span>🔍</span>
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