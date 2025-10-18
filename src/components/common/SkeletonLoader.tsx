import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'card' | 'avatar' | 'book' | 'table';
  count?: number;
  className?: string;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'text', 
  count = 1,
  className = ''
}) => {
  const baseClass = 'animate-pulse bg-gray-200 rounded';

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-white rounded-xl shadow-md p-4 ${className}`}>
            <div className={`${baseClass} h-48 mb-4`}></div>
            <div className={`${baseClass} h-4 w-3/4 mb-2`}></div>
            <div className={`${baseClass} h-4 w-1/2`}></div>
          </div>
        );
      
      case 'avatar':
        return (
          <div className={`${baseClass} rounded-full w-12 h-12 ${className}`}></div>
        );
      
      case 'book':
        return (
          <div className={`${className}`}>
            <div className={`${baseClass} aspect-[2/3] mb-3`}></div>
            <div className={`${baseClass} h-4 w-full mb-2`}></div>
            <div className={`${baseClass} h-3 w-2/3`}></div>
          </div>
        );
      
      case 'table':
        return (
          <div className={`space-y-3 ${className}`}>
            <div className={`${baseClass} h-12 w-full`}></div>
            <div className={`${baseClass} h-10 w-full`}></div>
            <div className={`${baseClass} h-10 w-full`}></div>
            <div className={`${baseClass} h-10 w-full`}></div>
          </div>
        );
      
      default:
        return (
          <div className={`space-y-2 ${className}`}>
            <div className={`${baseClass} h-4 w-full`}></div>
            <div className={`${baseClass} h-4 w-5/6`}></div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
};

export default SkeletonLoader;
