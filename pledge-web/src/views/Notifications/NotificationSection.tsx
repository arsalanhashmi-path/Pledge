import React from 'react';

interface NotificationSectionProps {
    title: string;
    count: number;
    children: React.ReactNode;
    gridClass?: string;
}

export const NotificationSection: React.FC<NotificationSectionProps> = ({ 
    title, 
    count, 
    children, 
    gridClass = 'grid-cols-1 md:grid-cols-2' 
}) => {
    if (count === 0) return null;

    return (
        <section className="space-y-6 animate-slide-up">
            <div className="flex items-center space-x-4">
                <h3 className="text-[10px] font-bold text-muted uppercase tracking-widest whitespace-nowrap">
                    {title} ({count})
                </h3>
                <div className="h-px bg-border flex-1" />
            </div>

            <div className={`grid gap-4 ${gridClass}`}>
                {children}
            </div>
        </section>
    );
};
