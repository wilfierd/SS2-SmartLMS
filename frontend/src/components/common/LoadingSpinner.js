// src/components/common/LoadingSpinner.js
import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ 
  text = 'Loading...', 
  size = 'medium', 
  centered = true,
  className = '' 
}) => {
  const getSpinnerClass = () => {
    let classes = ['loading-spinner-component'];
    
    if (size === 'small') classes.push('spinner-small');
    if (size === 'large') classes.push('spinner-large');
    if (centered) classes.push('spinner-centered');
    if (className) classes.push(className);
    
    return classes.join(' ');
  };

  return (
    <div className={getSpinnerClass()}>
      <div className="spinner-circle"></div>
      {text && <div className="spinner-text">{text}</div>}
    </div>
  );
};

export default LoadingSpinner;