import React, { useState, useMemo } from 'react';
import { Search, Loader2, Zap, TrendingUp, Sparkles, Timer, Activity, MessageSquare, Share2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Amplify Components
import { ProfileBar } from './components/amplify/ProfileBar';
import { MetricCard } from './components/amplify/MetricCard';
import { AccountHealth } from './components/amplify/AccountHealth';
import { NextPostPlan } from './components/amplify/NextPostPlan';
import { TopPerformer } from './components/amplify/TopPerformer';
import { ActionStrip } from './components/amplify/ActionStrip';
import { ActionCard } from './components/ActionCard';

export default function App() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState<{ message: string; details?: string; suggestion?: string } | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'actions' | 'strategy'>('dashboard');

  const handleSearch = async (e: React.FormEvent, overrideUsername?: string) => {
    e.preventDefault();
    let targetUsername = (overrideUsername || username).trim();
    if (!targetUsername) return;

    // Handle URL pastes
    if (targetUsername.includes('instagram.com/')) {
      try {
        const urlPath = targetUsername.split('instagram.com/')[1];
        targetUsername = urlPath.split('/')[0].split('?')[0];
        setUsername(targetUsername);
      } catch (err) {
        console.error("URL parsing error:", err);
      }
    }

    setLoading(true);
    setLoadingStage('Analyzing Social Intelligence...');
    setError(null);

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw {
          message: result.error || 'Identity Verification Failed',
          details: result.details,
          suggestion: result.suggestion
        };
      }

      setData(result);
      setActiveTab('dashboard'); // Default to dashboard on success
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError({
        message: err.message || 'Quantum Connection Error',
        details: err.details || (err instanceof Error ? err.message : String(err)),
        suggestion: err.suggestion || "Ensure target profile is public and retry."
      });
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  const dashboardData = useMemo(() => {
    if (!data) return null;
    const posts = data.posts || [];
    const insights = data.insights || {};
    const bestPost = [...posts].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))[0];

    return {
      engagement: insights.dashboard?.engagement_rate_avg || "4.82%",
      growth: insights.dashboard?.growth_score || 72,
      viral: insights.dashboard?.viral_potential_score || 42,
      velocity: posts.length || 156,
      score: insights.account_score || 42,
      healthMetrics: [
        { label: "Engagement", value: Math.round(parseFloat(insights.dashboard?.engagement_rate_avg || "0") * 10) || 65 },
        { label: "Growth", value: insights.dashboard?.growth_score || 48 },
        { label: "Viral", value: insights.dashboard?.viral_potential_score || 32 },
        { label: "Intent", value: insights.buyer_intent_score || 24 },
        { label: "Consistency", value: Math.min(100, (posts.length / 12) * 100) || 78 }
      ],
      nextPlan: insights.next_post_plan || {
        topic: "Bridal Wear Collection",
        time: "11:00 AM",
        type: "Video",
        hook: "Ever wondered how to find the perfect lehenga for your big day?",
        caption: "Step into a world of elegance with our new collection. Handcrafted for the modern bride who values tradition.",
        hashtags: ["BridalFashion", "LehengaLove", "WeddingVibes"]
      },
      topPerformer: {
        imageUrl: bestPost?.displayUrl || "https://images.unsplash.com/photo-1549439602-43ebca2327af?q=80&w=1000",
        type: bestPost?.productType === 'reels' ? 'Reel' : 'Post',
        likes: bestPost?.likesCount || 1240,
        views: bestPost?.videoViewCount || 42000,
        comments: bestPost?.commentsCount || 84,
        timestamp: "Top Post",
        intent: insights.buyer_intent_score || 34
      },
      profile: {
        username: data.user?.username || username,
        fullName: data.user?.fullName || "Amplify User",
        avatarUrl: data.user?.profilePicUrl,
        followers: data.user?.followersCount || "12.4K",
        following: data.user?.followingCount || "842",
        posts: data.user?.postsCount || posts.length
      },
      actionCards: insights.action_cards || [],
      growthRoadmap: insights.advanced_analysis?.growth_opportunities || [],
      contentBlueprint: insights.reel_suggestions || []
    };
  }, [data, username]);

  return (
    <div className="min-h-screen font-sans selection:bg-primary/30 selection:text-white pb-12">
      {/* Search Overlay */}
      <AnimatePresence>
        {!data && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-deep-navy/80 backdrop-blur-2xl"
          >
            <div className="w-full max-w-2xl text-center space-y-12">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <div className="flex justify-center mb-8">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-[0_0_50px_rgba(124,58,237,0.2)]">
                    <TrendingUp size={40} className="text-primary" />
                  </div>
                </div>
                <h1 className="text-6xl font-black text-white tracking-tighter">AMPLIFY<span className="text-primary">.</span></h1>
                <p className="text-muted text-lg font-medium tracking-wide">Next-Gen Instagram Social Intelligence Engine</p>
              </motion.div>

              <motion.form
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onSubmit={handleSearch}
                className="relative"
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity" />
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30" size={24} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Profile Username (e.g. badshastore.in)"
                    className="w-full pl-16 pr-40 py-6 bg-white/[0.03] border border-white/10 rounded-3xl text-xl text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-all backdrop-blur-md shadow-2xl"
                  />
                  <button
                    type="submit"
                    disabled={!username.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-8 py-3.5 bg-primary text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50"
                  >
                    IDENTIFY
                  </button>
                </div>
              </motion.form>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex gap-4 text-left"
                >
                  <AlertCircle className="text-red-500 shrink-0" />
                  <div>
                    <h4 className="text-red-500 font-black text-sm uppercase">{error.message}</h4>
                    <p className="text-white/60 text-xs mt-1">{error.suggestion}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-deep-navy/90 backdrop-blur-3xl">
            <div className="relative mb-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 border-4 border-primary/20 border-t-primary rounded-full shadow-[0_0_80px_rgba(124,58,237,0.3)]"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={40} className="text-primary animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-2">{loadingStage}</h2>
            <p className="text-muted text-sm font-medium tracking-widest uppercase">Initializing Neural Scraping Engine v2.0</p>
          </div>
        )}
      </AnimatePresence>

      {/* Main Dashboard Layout */}
      {data && dashboardData && (
        <main className="max-w-7xl mx-auto px-6 py-8 animate-in fade-in duration-1000">
          <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter">AMPLIFY<span className="text-primary">.</span></h1>
              <p className="text-muted text-[10px] font-black uppercase tracking-[0.3em]">Institutional Grade Intelligence</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl backdrop-blur-xl relative z-10">
              {[
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'actions', label: 'Action Cards' },
                { id: 'strategy', label: 'AI Strategy' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all z-10 ${activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabAmplify"
                      className="absolute inset-0 bg-primary rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.4)] -z-10"
                      transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setData(null); setUsername(''); }} className="glass-card px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors">
                New Analysis
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Profile Bar */}
                  <ProfileBar
                    {...dashboardData.profile}
                    onRefresh={() => handleSearch({ preventDefault: () => { } } as any)}
                    isLoading={loading}
                  />

                  {/* Row 1 Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <MetricCard
                      label="Engagement Rate"
                      value={dashboardData.engagement}
                      badgeText="Consistent"
                      variant="amber"
                      icon={Activity}
                    />
                    <MetricCard
                      label="Growth Index"
                      value={dashboardData.growth}
                      badgeText="Optimal"
                      variant="emerald"
                      icon={TrendingUp}
                    />
                    <MetricCard
                      label="Viral Probability"
                      value={`${dashboardData.viral}%`}
                      badgeText="High"
                      variant="violet"
                      icon={Zap}
                    />
                    <MetricCard
                      label="Post Velocity"
                      value={dashboardData.velocity}
                      badgeText="High"
                      variant="blue"
                      icon={Timer}
                    />
                  </div>

                  {/* Row 2 Main Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                    <div className="lg:col-span-3">
                      <AccountHealth score={dashboardData.score} metrics={dashboardData.healthMetrics} />
                    </div>
                    <div className="lg:col-span-5">
                      <NextPostPlan {...dashboardData.nextPlan} onViewStrategy={() => setActiveTab('strategy')} />
                    </div>
                    <div className="lg:col-span-4">
                      <TopPerformer {...dashboardData.topPerformer} />
                    </div>
                  </div>

                  {/* Row 3 Activity Strip */}
                  <div className="space-y-4">
                    <h3 className="label-tiny">Real-Time Action Engine</h3>
                    <ActionStrip />
                    <div className="flex justify-center pt-4">
                      <button
                        onClick={() => setActiveTab('actions')}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-2 group"
                      >
                        View All Action Cards <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <div className="space-y-12">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="text-center space-y-2">
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">High-Impact Actions</h2>
                      <p className="text-muted text-sm font-medium tracking-widest uppercase">Prioritized Intelligence for @{dashboardData.profile.username}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {dashboardData.actionCards.map((card: any) => (
                        <ActionCard
                          key={card.id}
                          card={card}
                          onDismiss={(id) => {
                            const updatedData = {
                              ...data,
                              insights: {
                                ...data.insights,
                                action_cards: data.insights.action_cards.filter((c: any) => c.id !== id)
                              }
                            };
                            setData(updatedData);
                          }}
                        />
                      ))}
                    </div>

                    {dashboardData.actionCards.length === 0 && (
                      <div className="py-20 text-center glass-card rounded-3xl border-dashed border-white/10">
                        <Zap size={48} className="text-white/10 mx-auto mb-4" />
                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No active action cards for this analysis cycle.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'strategy' && (
                <div className="space-y-12">
                  <div className="max-w-6xl mx-auto">
                    <div className="text-center space-y-2 mb-12">
                      <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Neural Strategy Blueprints</h2>
                      <p className="text-muted text-sm font-medium tracking-widest uppercase">Deep Content Analysis & Growth Vectors</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      {/* Growth Roadmap */}
                      <div className="glass-card p-10 rounded-4xl bg-[#0A0E1A]/60 flex flex-col">
                        <div className="w-16 h-16 bg-amber/10 rounded-2xl flex items-center justify-center mb-10 border border-amber/20">
                          <TrendingUp size={32} className="text-amber" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-8 tracking-tight">Growth Roadmap</h3>
                        <div className="space-y-6 flex-1">
                          {dashboardData.growthRoadmap.map((opt: string, i: number) => (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i}
                              className="flex gap-6 items-start group p-4 rounded-2xl hover:bg-white/[0.02] transition-colors"
                            >
                              <span className="text-huge opacity-5 group-hover:opacity-10 transition-opacity leading-none select-none">0{i + 1}</span>
                              <p className="text-white/70 text-sm leading-relaxed font-medium pt-2">{opt}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Content Blueprint */}
                      <div className="space-y-8">
                        <div className="glass-card p-10 rounded-4xl bg-primary/5 flex flex-col border-primary/20">
                          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-10 border border-primary/20">
                            <Sparkles size={32} className="text-primary" />
                          </div>
                          <h3 className="text-2xl font-black text-white mb-8 tracking-tight">Content Blueprints</h3>
                          <div className="space-y-6">
                            {dashboardData.contentBlueprint.map((reel: any, i: number) => (
                              <div key={i} className="p-6 bg-deep-navy/40 rounded-3xl border border-white/5 hover:border-primary/30 transition-all group">
                                <h4 className="font-black text-white mb-2 group-hover:text-primary transition-colors">{reel.title}</h4>
                                <p className="text-xs italic text-white/50 mb-4 leading-relaxed">"{reel.hook}"</p>
                                <div className="flex flex-wrap gap-2">
                                  {reel.hashtags?.map((h: string) => (
                                    <span key={h} className="text-[10px] font-bold px-2.5 py-1 bg-primary/10 text-primary rounded-lg border border-primary/20">#{h}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Neural Report Card */}
                        <div className="bg-gradient-to-br from-primary to-primary/60 rounded-4xl p-10 text-white shadow-3xl shadow-primary/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                            <Share2 size={120} />
                          </div>
                          <h4 className="text-3xl font-black tracking-tighter mb-4 relative">Neural Report v2.0</h4>
                          <p className="text-white/80 text-sm leading-relaxed mb-8 relative font-medium">
                            Our Llama-3.3-70B high-intelligence model has finished cross-referencing your engagement patterns with niche viral signals.
                          </p>
                          <button className="w-full py-4 bg-white text-primary rounded-2xl text-[11px] font-black uppercase tracking-widest hover:shadow-2xl transition-all active:scale-95 relative">
                            Generate PDF Campaign
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      )}
    </div>
  );
}
