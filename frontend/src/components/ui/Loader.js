import React from 'react';

export const Loader = ({ size = 'md', text, fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-20 h-20 border-4',
    xl: 'w-24 h-24 border-4'
  };

  const containerClass = fullScreen
    ? 'fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-primary/10 flex flex-col items-center justify-center z-50 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={containerClass}>
      <div className="text-center space-y-4 md:space-y-6 px-4">
        {/* Animated Spinner with Multiple Rings */}
        <div className="relative mx-auto">
          {/* Main Spinning Ring */}
          <div
            className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
            style={{
              animation: 'spin 1s linear infinite'
            }}
          />
          {/* Pulsing Outer Ring */}
          <div
            className={`absolute inset-0 ${sizeClasses[size]} border-primary/30 rounded-full animate-ping`}
          />
          {/* Inner Glow */}
          <div
            className={`absolute inset-2 ${size === 'lg' ? 'w-16 h-16' : size === 'xl' ? 'w-20 h-20' : size === 'md' ? 'w-8 h-8' : 'w-4 h-4'} bg-primary/10 rounded-full animate-pulse`}
          />
        </div>
        
        {/* Loading Text with Dots */}
        {text && (
          <div className="space-y-2 md:space-y-3">
            <p className="text-base md:text-lg font-semibold text-foreground">
              {text}
            </p>
            <div className="flex items-center justify-center gap-1.5 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const InlineLoader = ({ text }) => {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="w-5 h-5 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

export const ButtonLoader = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      <span>Loading...</span>
    </div>
  );
};

