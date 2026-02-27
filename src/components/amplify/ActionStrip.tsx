import { ActionCardData } from '../../types/ActionCard';
import { Rocket, Clock, Flame, Users, ArrowRight, Zap, TrendingUp, Target } from 'lucide-react';

interface ActionStripProps {
    cards?: ActionCardData[];
}

export const ActionStrip: React.FC<ActionStripProps> = ({ cards = [] }) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'growth': return <Rocket size={20} />;
            case 'sales': return <Flame size={20} />;
            case 'engagement': return <TrendingUp size={20} />;
            case 'opportunity': return <Zap size={20} />;
            case 'warning': return <Target size={20} />;
            default: return <Rocket size={20} />;
        }
    };

    const getStyles = (type: string) => {
        switch (type) {
            case 'growth': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'sales': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'engagement': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            case 'opportunity': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'warning': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-zinc-400 bg-white/5 border-white/10';
        }
    };

    if (cards.length === 0) return null;

    return (
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide py-3 no-scrollbar">
            {cards.slice(0, 5).map((card) => (
                <div
                    key={card.id}
                    className="glass-card min-w-[320px] flex-1 p-6 rounded-2xl flex flex-col justify-between group transition-all duration-300 border border-white/5 hover:border-white/10"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${getStyles(card.type)}`}>
                            {getIcon(card.type)}
                        </div>
                        <h4 className="text-sm font-black text-white line-clamp-1">{card.title}</h4>
                    </div>

                    <p className="text-[12px] text-muted leading-relaxed font-medium mb-4 line-clamp-2">
                        {card.action.primary}
                    </p>

                    <div className="flex justify-between items-center mt-auto">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 whitespace-nowrap">
                            Confidence: {card.confidence_score}%
                        </span>
                        <ArrowRight size={14} className="text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                </div>
            ))}
        </div>
    );
};
