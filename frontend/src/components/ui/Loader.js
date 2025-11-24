import React from 'react';

export const Loader = ({ size = 'md', text, fullScreen = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-20 h-20 border-4',
    xl: 'w-24 h-24 border-4'
  };

  const containerClass = fullScreen
    ? 'fixed inset-0 bg-gradient-to-br from-[#14b8a6]/5 via-gray-50 to-[#14b8a6]/5 flex flex-col items-center justify-center z-50 backdrop-blur-sm'
    : 'flex flex-col items-center justify-center py-8';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center justify-center space-y-4 md:space-y-6">
        {/* Animated Spinner - Centered */}
        <div className="relative flex items-center justify-center">
          {/* Main Spinning Ring */}
          <div
            className={`${sizeClasses[size]} border-[#14b8a6] border-t-transparent rounded-full animate-spin`}
            style={{
              animation: 'spin 1s linear infinite'
            }}
          />
          {/* Pulsing Outer Ring */}
          <div
            className={`absolute inset-0 ${sizeClasses[size]} border-[#14b8a6]/30 rounded-full animate-ping`}
          />
          {/* Inner Glow */}
          <div
            className={`absolute inset-2 ${size === 'lg' ? 'w-16 h-16' : size === 'xl' ? 'w-20 h-20' : size === 'md' ? 'w-8 h-8' : 'w-4 h-4'} bg-[#14b8a6]/10 rounded-full animate-pulse`}
          />
        </div>
        
        {/* Loading Text - Centered, No Dots */}
        {text && (
          <p className="text-base md:text-lg font-semibold text-gray-700 text-center" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

export const InlineLoader = ({ text }) => {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="w-5 h-5 border-3 border-[#14b8a6]/20 border-t-[#14b8a6] rounded-full animate-spin" />
      {text && <span className="text-sm text-gray-600" style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>{text}</span>}
    </div>
  );
};

export const ButtonLoader = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      <span style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>Loading...</span>
    </div>
  );
};
