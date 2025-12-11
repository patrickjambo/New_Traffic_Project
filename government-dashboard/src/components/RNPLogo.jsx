// Rwanda National Police Logo Component
import React from 'react';

const RNPLogo = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} bg-white rounded-full flex items-center justify-center p-1 shadow-lg`}>
      <img 
        src="/assets/rnp-logo.png"
        alt="Rwanda National Police"
        className="w-full h-full object-contain rounded-full"
        onError={(e) => {
          // Fallback display
          e.target.style.display = 'none';
          const fallback = e.target.nextSibling;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      <div className="w-full h-full items-center justify-center hidden bg-blue-900 rounded-full" style={{display: 'none'}}>
        <span className="text-white text-2xl">🚔</span>
      </div>
    </div>
  );
};

export default RNPLogo;
