import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
        success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
        warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
        destructive: 'bg-red-50 text-red-600 dark:bg-red-500/20 dark:text-red-300',
        outline: 'border border-border text-muted'
    };

    return (
        <span className={`
            text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg
            ${variants[variant]}
            ${className}
        `}>
            {children}
        </span>
    );
};
