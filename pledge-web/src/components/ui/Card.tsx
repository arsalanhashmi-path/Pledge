import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hoverEffect = false }) => {
    return (
        <div 
            onClick={onClick}
            className={`
                bg-surface p-6 rounded-[2rem] border border-border 
                shadow-lg shadow-slate-900/5 
                ${hoverEffect ? 'transition-all hover:border-emerald-500/30 hover:-translate-y-1 cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};
