import React from 'react';
import { Clock, Sparkles } from 'lucide-react';

interface NextPostPlanProps {
    title?: string;
    time?: string;
    type?: string;
    collab?: boolean;
    hook?: string;
    caption?: string;
    hashtags?: string[];
    onViewStrategy?: () => void;
}

export const NextPostPlan: React.FC<NextPostPlanProps> = ({
    title = "Bridal Wear Collection",
    time = "11:00 AM",
    type = "Video",
    collab = true,
    hook = "Ever wondered how to find the perfect lehenga for your big day?",
    caption = "Step into a world of elegance with our new collection. Handcrafted for the modern bride who values tradition. Our Bridal 2024 series is now live!",
    hashtags = ["BridalFashion", "LehengaLove", "WeddingVibes"],
    onViewStrategy
}) => {
    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col h-full relative">
            <div className="flex justify-between items-start mb-6">
                <span className="pill-badge bg-primary text-white border-primary/20 scale-110 origin-left">
                    NEXT POST PLAN
                </span>
                <Sparkles size={20} className="text-primary/50" />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">{title}</h3>

            <div className="flex items-center gap-2 text-[10px] font-bold text-primary mb-6">
                <Clock size={12} />
                <span>{time} · {type} {collab && "· Collab"}</span>
            </div>

            <div className="flex-1 bg-deep-navy/40 rounded-xl p-5 border border-white/5 space-y-4 mb-6">
                <div>
                    <span className="label-tiny block mb-1">HOOK</span>
                    <p className="text-sm italic text-white/90 leading-relaxed font-medium">"{hook}"</p>
                </div>
                <div>
                    <span className="label-tiny block mb-1">CAPTION</span>
                    <p className="text-[12px] text-white/50 leading-relaxed line-clamp-2">{caption}</p>
                </div>
                <div>
                    <span className="label-tiny block mb-2">HASHTAGS</span>
                    <div className="flex flex-wrap gap-2">
                        {hashtags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <button
                onClick={onViewStrategy}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all active:scale-95"
            >
                VIEW FULL STRATEGY
            </button>
        </div>
    );
};
