import React from 'react';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name = 'Operator', size = 'md', className = '' }) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-[14px]',
    lg: 'w-16 h-16 text-[22px]',
    xl: 'w-24 h-24 text-[32px]',
  };

  const baseClasses = `relative flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${sizeClasses[size]} ${className}`;

  if (src) {
    return (
      <div className={`${baseClasses} border-2 border-[rgba(76,215,246,0.3)] bg-surface-container`}>
        <img src={src} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${baseClasses} border-2 border-[rgba(208,188,255,0.4)] shadow-[0_0_15px_rgba(208,188,255,0.15)]`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#121319] to-[#252033]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(208,188,255,0.2)_0%,_transparent_60%)]" />
      <span className="relative z-10 font-label-lg font-bold text-transparent bg-clip-text bg-gradient-to-br from-primary to-[#d0bcff]">
        {getInitials(name)}
      </span>
    </div>
  );
};

export default Avatar;
