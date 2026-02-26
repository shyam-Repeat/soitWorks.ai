import React from 'react';
import { RefreshCcw } from 'lucide-react';

interface ProfileBarProps {
    username?: string;
    fullName?: string;
    avatarUrl?: string;
    followers?: string | number;
    following?: string | number;
    posts?: string | number;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export const ProfileBar: React.FC<ProfileBarProps> = ({
    username = "badshastore.in",
    fullName = "Bridal Lehenga Store",
    avatarUrl,
    followers = "12.4K",
    following = "842",
    posts = "156",
    onRefresh,
    isLoading = false
}) => {
    return (
        <div className="glass-card mb-8 px-6 py-3 rounded-2xl flex items-center justify-between border-b border-white/10 shadow-xl">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary/20 bg-deep-navy">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                            {username[0]?.toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <h2 className="text-sm font-black text-white leading-none">@{username}</h2>
                    <p className="text-[10px] text-muted font-medium mt-1">{fullName}</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-6 text-[10px] font-bold tracking-widest text-white/40">
                    <div className="flex flex-col items-center">
                        <span className="text-white">{followers}</span>
                        <span className="uppercase text-[8px]">Followers</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex flex-col items-center">
                        <span className="text-white">{following}</span>
                        <span className="uppercase text-[8px]">Following</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex flex-col items-center">
                        <span className="text-white">{posts}</span>
                        <span className="uppercase text-[8px]">Posts</span>
                    </div>
                </div>
            </div>

            <button
                onClick={onRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95 disabled:opacity-50"
            >
                <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
                Scrape Now
            </button>
        </div>
    );
};
