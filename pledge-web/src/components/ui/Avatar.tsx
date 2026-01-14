import React from 'react';

interface AvatarProps {
  initials?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  bgColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  initials = '?', 
  className = '', 
  size = 'md',
  bgColor = 'bg-slate-100 dark:bg-slate-800'
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl'
  };

  return (
    <div className={`
      ${sizeClasses[size]} 
      ${bgColor} 
      rounded-full flex items-center justify-center font-bold 
      border border-slate-200 dark:border-slate-700
      shadow-sm
      ${className}
    `}>
      {initials}
    </div>
  );
};
