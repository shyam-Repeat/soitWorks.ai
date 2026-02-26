import React from 'react';
import { Rocket, Clock, Flame, Users, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ActionCardData {
    id: string;
    title: string;
    action: string;
    variant: 'violet' | 'blue' | 'amber' | 'emerald';
    icon: any;
}

const ACTION_CARDS: ActionCardData[] = [
    {
        id: '1',
        title: 'Viral Opportunity',
        action: 'Post Reels within 12-18s duration to double growth probability.',
        variant: 'violet',
        icon: Rocket
    },
    {
        id: '2',
        title: 'Best Time',
        action: 'Schedule next post at 11:00 AM EST for peak bridal engagement.',
        variant: 'blue',
        icon: Clock
    },
    {
        id: '3',
        title: 'Buyer Intent',
        action: 'Direct response found in 3 comments: reply with catalog link.',
        variant: 'amber',
        icon: Flame
    },
    {
        id: '4',
        title: 'Collab Boost',
        action: 'High overlap with @theweddingbrigade: consider a joint post.',
        variant: 'emerald',
        icon: Users
    }
];

export const ActionStrip: React.FC = () => {
    const getStyles = (variant: string) => {
        switch (variant) {
            case 'violet': return { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' };
            case 'blue': return { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
            case 'amber': return { color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20' };
            case 'emerald': return { color: 'text-emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
            default: return { color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' };
        }
    };

    return (
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide py-3 no-scrollbar">
            {ACTION_CARDS.map((card) => {
                const styles = getStyles(card.variant);
                const Icon = card.icon;
                return (
                    <div
                        key={card.id}
                        className="glass-card min-w-[300px] flex-1 p-6 rounded-xl flex flex-col justify-between group transition-all duration-300"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all", styles.bg, styles.border, styles.color)}>
                                <Icon size={20} />
                            </div>
                            <h4 className="text-sm font-black text-white">{card.title}</h4>
                        </div>

                        <p className="text-[12px] text-muted leading-relaxed font-medium mb-4">
                            {card.action}
                        </p>

                        <div className="flex justify-end mt-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={16} className={cn("text-white/50", styles.color)} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
