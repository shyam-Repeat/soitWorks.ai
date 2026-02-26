import React from 'react';
import { Heart, Play, MessageCircle, AlertTriangle } from 'lucide-react';

interface TopPerformerProps {
    imageUrl?: string;
    type?: string;
    timestamp?: string;
    likes?: number;
    views?: number;
    comments?: number;
    intent?: number;
}

export const TopPerformer: React.FC<TopPerformerProps> = ({
    imageUrl = "https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=1000",
    type = "Reel",
    timestamp = "2 hours ago",
    likes = 1240,
    views = 42000,
    comments = 84,
    intent = 34
}) => {
    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col h-full bg-[#0A0E1A]/40">
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Top Performer</h3>

            <div className="relative aspect-video rounded-xl overflow-hidden mb-6 border border-white/5">
                <img src={imageUrl} alt="Top Post" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-end">
                    <span className="pill-badge bg-white/20 text-white backdrop-blur-md border-white/10">
                        {type}
                    </span>
                    <span className="text-[10px] font-bold text-white/60">
                        {timestamp}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex flex-col items-center gap-1">
                    <Heart size={16} className="text-white/40" />
                    <span className="text-xs font-black text-white">{likes.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center gap-1 border-x border-white/5">
                    <Play size={16} className="text-white/40" />
                    <span className="text-xs font-black text-white">{views.toLocaleString()}</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <MessageCircle size={16} className="text-white/40" />
                    <span className="text-xs font-black text-white">{comments.toLocaleString()}</span>
                </div>
            </div>

            <div className="mt-auto flex items-center gap-3 px-4 py-3 bg-[#F59E0B]/20 rounded-xl border border-[#F59E0B]/30 shadow-inner">
                <AlertTriangle size={16} className="text-[#F59E0B]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B]">
                    🔥 Buyer Intent: {intent}%
                </span>
            </div>
        </div>
    );
};
