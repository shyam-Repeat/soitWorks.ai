import React from 'react';
import { LucideIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MetricCardProps {
    label: string;
    value: string | number;
    badgeText: string;
    icon: LucideIcon;
    variant: 'amber' | 'emerald' | 'violet' | 'blue';
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    badgeText,
    icon: Icon,
    variant
}) => {
    const variants = {
        amber: {
            border: "hover:border-amber/50",
            glow: "shadow-amber/10",
            badge: "bg-amber/10 text-amber border-amber/20",
            icon: "text-amber/50",
            innerGlow: "after:bg-amber/5"
        },
        emerald: {
            border: "hover:border-emerald/50",
            glow: "shadow-emerald/10",
            badge: "bg-emerald/10 text-emerald border-emerald/20",
            icon: "text-emerald/50",
            innerGlow: "after:bg-emerald/5"
        },
        violet: {
            border: "hover:border-primary/50",
            glow: "shadow-primary/10",
            badge: "bg-primary/10 text-primary border-primary/20",
            icon: "text-primary/50",
            innerGlow: "after:bg-primary/5"
        },
        blue: {
            border: "hover:border-blue-500/50",
            glow: "shadow-blue-500/10",
            badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            icon: "text-blue-500/50",
            innerGlow: "after:bg-blue-500/5"
        }
    };

    const style = variants[variant];

    return (
        <div className={cn(
            "glass-card p-6 rounded-2xl flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-300",
            style.border,
            style.glow,
            "after:content-[''] after:absolute after:inset-0 after:pointer-events-none",
            style.innerGlow
        )}>
            <div className="flex justify-between items-start">
                <span className="label-tiny">{label}</span>
                <Icon size={18} className={style.icon} />
            </div>

            <div className="my-4">
                <h3 className="text-huge text-white">{value}</h3>
            </div>

            <div>
                <span className={cn("pill-badge border", style.badge)}>
                    {badgeText}
                </span>
            </div>
        </div>
    );
};
