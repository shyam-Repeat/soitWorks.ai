import React, { useState } from 'react';
import { Clock, Sparkles, Copy, Check, Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NextPostPlanProps {
    topic?: string;
    time?: string;
    type?: string;
    collab?: boolean;
    hook?: string;
    caption?: string;
    hashtags?: string[];
    onViewStrategy?: () => void;
    niche?: string;
    isDevMode?: boolean;
}

export const NextPostPlan: React.FC<NextPostPlanProps> = ({
    topic = "Bridal Wear Collection",
    time = "11:00 AM",
    type = "Video",
    collab = true,
    hook = "Ever wondered how to find the perfect lehenga for your big day?",
    caption = "Step into a world of elegance with our new collection. Handcrafted for the modern bride who values tradition. Our Bridal 2024 series is now live!",
    hashtags = ["BridalFashion", "LehengaLove", "WeddingVibes"],
    onViewStrategy,
    niche = "Fashion",
    isDevMode = false
}) => {
    const [copiedSec, setCopiedSec] = useState<string | null>(null);
    const [thumbnailPrompt, setThumbnailPrompt] = useState<{ PROMPT: string; NEGATIVE_PROMPT: string } | null>(null);
    const [loadingThumbnail, setLoadingThumbnail] = useState(false);
    const [dryRunPrompt, setDryRunPrompt] = useState<string | null>(null);

    const handleCopy = (text: string, section: string) => {
        navigator.clipboard.writeText(text);
        setCopiedSec(section);
        setTimeout(() => setCopiedSec(null), 2000);
    };

    const generateThumbnail = async () => {
        console.log("[Thumbnail] Triggered. Topic:", topic, "Niche:", niche, "isDevMode:", isDevMode);
        setLoadingThumbnail(true);
        setDryRunPrompt(null);
        try {
            const res = await fetch('/api/generate-thumbnail-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    niche,
                    productName: topic,
                    caption,
                    keyDetails: hook,
                    dryRun: isDevMode
                })
            });
            if (res.ok) {
                const result = await res.json();
                if (result.dryRun) {
                    setDryRunPrompt(result.prompt);
                } else {
                    setThumbnailPrompt(result);
                }
            }
        } catch (err) {
            console.error("Thumbnail generation error:", err);
        } finally {
            setLoadingThumbnail(false);
        }
    };

    return (
        <div className="brutalist-card p-8 flex flex-col h-full !bg-white">
            <div className="flex justify-between items-start mb-8">
                <span className="pill-badge !bg-accent !text-black !border-black scale-110 origin-left !shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    NEXT POST PLAN
                </span>
                <Sparkles size={24} className="text-black animate-pulse" />
            </div>

            <h3 className="text-3xl font-black text-black mb-2 tracking-tighter uppercase">{topic}</h3>

            <div className="flex items-center gap-3 text-xs font-black text-black/80 mb-8 uppercase tracking-widest">
                <Clock size={14} className="text-black" />
                <span>{time} · {type} {collab && "· Collab"}</span>
            </div>

            <div className="flex-1 bg-white border-4 border-black p-6 space-y-6 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-y-auto max-h-[400px]">
                <div className="relative group">
                    <div className="flex justify-between items-center mb-2">
                        <span className="brutalist-label">HOOK</span>
                        <button
                            onClick={() => handleCopy(hook, 'hook')}
                            className="p-1 hover:bg-accent border-2 border-transparent hover:border-black transition-all"
                            title="Copy Hook"
                        >
                            {copiedSec === 'hook' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                    <p className="text-sm italic text-black leading-relaxed font-black">"{hook}"</p>
                </div>

                <div className="border-t-4 border-black pt-4 relative group">
                    <div className="flex justify-between items-center mb-2">
                        <span className="brutalist-label">CAPTION</span>
                        <button
                            onClick={() => handleCopy(caption, 'caption')}
                            className="p-1 hover:bg-accent border-2 border-transparent hover:border-black transition-all"
                            title="Copy Caption"
                        >
                            {copiedSec === 'caption' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                    <p className="text-xs text-black/70 leading-relaxed font-bold">{caption}</p>
                </div>

                <div className="border-t-4 border-black pt-4 relative group">
                    <div className="flex justify-between items-center mb-3">
                        <span className="brutalist-label">HASHTAGS</span>
                        <button
                            onClick={() => handleCopy(hashtags.map(t => `#${t}`).join(' '), 'hashtags')}
                            className="p-1 hover:bg-accent border-2 border-transparent hover:border-black transition-all"
                            title="Copy Hashtags"
                        >
                            {copiedSec === 'hashtags' ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {hashtags.map((tag, i) => (
                            <span key={i} className="pill-badge !text-[9px] !bg-black !text-white !border-black">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>

                {dryRunPrompt && (
                    <div className="border-t-4 border-black pt-4 bg-blue-50 -mx-6 px-6 pb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="brutalist-label !bg-blue-600 !text-white uppercase">Dev: Outgoing Prompt</span>
                            <button
                                onClick={() => handleCopy(dryRunPrompt, 'dryrun')}
                                className="p-1 hover:bg-accent border-2 border-black transition-all"
                            >
                                {copiedSec === 'dryrun' ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="bg-white border-2 border-black p-3 text-[9px] font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                            {dryRunPrompt}
                        </div>
                    </div>
                )}

                {thumbnailPrompt && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t-4 border-black pt-4 bg-yellow-50 -mx-6 px-6 pb-4"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="brutalist-label !bg-black !text-white">AI THUMBNAIL PROMPT</span>
                            <button
                                onClick={() => handleCopy(thumbnailPrompt.PROMPT, 'prompt')}
                                className="p-1 hover:bg-accent border-2 border-black transition-all"
                            >
                                {copiedSec === 'prompt' ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                        <p className="text-[10px] font-black text-black mb-2 leading-tight uppercase">
                            Instruction: Paste this prompt into Leonardo AI / Midjourney
                        </p>
                        <div className="bg-white border-2 border-black p-3 text-[10px] font-bold mb-2 italic">
                            {thumbnailPrompt.PROMPT}
                        </div>
                        {thumbnailPrompt.NEGATIVE_PROMPT && (
                            <div className="text-[9px] text-red-600 font-black uppercase">
                                Negative: {thumbnailPrompt.NEGATIVE_PROMPT}
                            </div>
                        )}
                        <div className="mt-4 p-3 bg-black text-white text-[10px] font-black flex items-center justify-between">
                            <span>NANO BANANA GEMINI</span>
                            <a
                                href="https://gemini.google.com"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-accent hover:underline"
                            >
                                OPEN AI <ExternalLink size={10} />
                            </a>
                        </div>
                        <p className="text-[8px] mt-2 font-bold text-black/50 italic text-center">
                            Note: Paste exact prompt and with your product to post now!
                        </p>
                    </motion.div>
                )}
            </div>

            <div className="flex gap-4 mt-auto">
                <button
                    onClick={onViewStrategy}
                    className="brutalist-button !flex-1 !bg-black !text-white hover:!bg-accent hover:!text-black !py-4"
                >
                    FULL STRATEGY
                </button>
                <div className="relative group">
                    <button
                        onClick={generateThumbnail}
                        disabled={loadingThumbnail}
                        className="brutalist-button !bg-accent !text-black hover:!bg-black hover:!text-white !aspect-square flex items-center justify-center p-0 w-16 h-16"
                        title="Generate AI Thumbnail Prompt"
                    >
                        {loadingThumbnail ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} />}
                    </button>
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] font-black px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest whitespace-nowrap pointer-events-none border-2 border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        Generate Thumbnails
                    </span>
                    {isDevMode && (
                        <span className="absolute -bottom-2 -left-2 bg-blue-600 text-white text-[6px] font-black px-1 border border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase">
                            MOCK
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
