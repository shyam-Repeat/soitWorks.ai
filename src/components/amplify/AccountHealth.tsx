import React from 'react';
import { motion } from 'framer-motion';

interface HealthMetric {
    label: string;
    value: number;
}

interface AccountHealthProps {
    score: number;
    metrics: HealthMetric[];
}

export const AccountHealth: React.FC<AccountHealthProps> = ({
    score = 42,
    metrics = [
        { label: "Engagement", value: 65 },
        { label: "Growth", value: 48 },
        { label: "Viral", value: 32 },
        { label: "Conversion", value: 24 },
        { label: "Content Mix", value: 78 }
    ]
}) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    // Arc is half circle (or 180 deg)
    const arcLength = circumference / 2;
    const strokeDashoffset = arcLength - (score / 100) * arcLength;

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center h-full">
            <div className="relative w-48 h-32 mb-4">
                <svg className="w-full h-full" viewBox="0 0 120 70">
                    {/* Background track */}
                    <path
                        d="M10,60 A50,50 0 0,1 110,60"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                    {/* Active arc */}
                    <motion.path
                        d="M10,60 A50,50 0 0,1 110,60"
                        fill="none"
                        stroke="url(#healthGradient)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={arcLength}
                        initial={{ strokeDashoffset: arcLength }}
                        animate={{ strokeDashoffset: strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />
                    <defs>
                        <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#7C3AED" />
                            <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className="text-4xl font-black text-white">{score}</span>
                </div>
            </div>

            <div className="w-full space-y-4 mb-6">
                {metrics.map((m, i) => (
                    <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                            <span className="text-white/40">{m.label}</span>
                            <span className="text-white">{m.value}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.value}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="h-full bg-primary"
                            />
                        </div>
                    </div>
                ))}
            </div>

            <h4 className="text-sm font-black text-white uppercase tracking-widest mt-auto">Account Health</h4>
        </div>
    );
};
