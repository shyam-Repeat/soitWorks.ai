import express from "express";
import { createServer as createViteServer } from "vite";
import { ApifyClient } from 'apify-client';
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

dotenv.config();

// ─── Load instruction markdown files once at startup ─────────────────────────
const loadFile = (filePath: string) => {
  try { return fs.readFileSync(path.resolve(filePath), "utf-8"); }
  catch { return ""; }
};
const brain = loadFile("src/brain.md");
const instruction = loadFile("src/instruction.md");
const analysis = loadFile("src/analysis_instruction.md");

// ─── AI call helper: tries providers in order ────────────────────────────────
async function callAI(prompt: string): Promise<any> {
  const hfKey = process.env.HF_TOKEN || process.env.HF_API_KEY || "";

  // 1. Gemini
  if (process.env.GEMINI_API_KEY) {
    console.log("AI Provider: Gemini");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    let txt = result.response.text();
    if (txt.includes("```json")) txt = txt.split("```json")[1].split("```")[0];
    else if (txt.includes("```")) txt = txt.split("```")[1].split("```")[0];
    return JSON.parse(txt.trim());
  }

  // 2. Real Groq key (starts with gsk_)
  if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.startsWith("hf_")) {
    console.log("AI Provider: Groq (direct)");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });
    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  }

  // 3. HF Router → Groq (free HF key, no Groq account needed)
  if (hfKey) {
    console.log("AI Provider: HF Router → Groq (llama-3.3-70b)");
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${hfKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct:groq",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`HF Router error (${res.status}): ${errText.substring(0, 200)}`);
    } else {
      const data: any = await res.json();
      let txt: string = data.choices?.[0]?.message?.content || "{}";
      if (txt.includes("```json")) txt = txt.split("```json")[1].split("```")[0];
      else if (txt.includes("```")) txt = txt.split("```")[1].split("```")[0];
      return JSON.parse(txt.trim());
    }
  }

  throw new Error("No valid AI provider found. Set GEMINI_API_KEY, GROQ_API_KEY, or HF_API_KEY.");
}

// ─── Compute a basic fallback dashboard from raw post data ───────────────────
function computeBasicInsights(summaryData: any[], followers: number = 0) {
  const total = summaryData.length;
  if (total === 0) return {};

  const avgLikes = Math.round(summaryData.reduce((s, p) => s + p.like_count, 0) / total);
  const avgComments = Math.round(summaryData.reduce((s, p) => s + p.comments_count, 0) / total);
  const avgViews = Math.round(summaryData.reduce((s, p) => s + p.view_count, 0) / total);

  // Buyer Intent detection
  const BUYER_INTENT_KEYWORDS = ["price", "pp", "cost", "how much", "rate", "available", "dm", "where", "buy", "shop", "whatsapp", "contact", "booking"];
  let totalBuyerIntentComments = 0;
  let totalFilteredComments = 0;

  summaryData.forEach(p => {
    if (p.latest_comments) {
      p.latest_comments.forEach((c: any) => {
        totalFilteredComments++;
        const text = (c.text || "").toLowerCase();
        if (BUYER_INTENT_KEYWORDS.some(k => text.includes(k))) totalBuyerIntentComments++;
      });
    }
  });

  const buyerIntentScore = totalFilteredComments > 0
    ? Math.round((totalBuyerIntentComments / totalFilteredComments) * 100)
    : 0;

  // Engagement Rate (Follower based if available, else View based)
  let engRate = "0.00%";
  let rawEngRate = 0;
  if (followers > 0) {
    rawEngRate = ((avgLikes + avgComments) / followers) * 100;
    engRate = `${rawEngRate.toFixed(2)}%`;
  } else if (avgViews > 0) {
    rawEngRate = ((avgLikes + avgComments) / avgViews) * 100;
    engRate = `${rawEngRate.toFixed(2)}%`;
  }

  // Account Score calculation (Weighted)
  const engagementScoreFinal = Math.min(100, Math.round(rawEngRate * 10)); // normalized
  const viewScore = Math.min(100, Math.round(avgViews / 200)); // slightly more sensitive scaling
  const accountScoreFinal = Math.min(100, Math.round(
    (engagementScoreFinal * 0.4) +
    (viewScore * 0.3) +
    (buyerIntentScore * 0.3)
  ));

  const scored = summaryData.map(p => ({
    ...p,
    eng: (p.like_count + p.comments_count * 2) / Math.max(p.view_count, 1),
  }));
  scored.sort((a, b) => b.eng - a.eng);

  // Viral check
  const viralPostsCount = summaryData.filter(p => p.view_count > (avgViews * 1.5)).length;
  const viralPotential = Math.min(100, Math.round((viralPostsCount / total) * 100) + 20);

  // Best posting hour
  const hourCounts: Record<number, number> = {};
  summaryData.forEach(p => {
    if (p.timestamp) {
      const h = new Date(p.timestamp).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });
  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const bestHourFinal = sortedHours[0]?.[0] ?? "12";

  // Top hashtags
  const hashtagCount: Record<string, number> = {};
  summaryData.forEach(p => (p.hashtags || []).forEach((h: string) => { hashtagCount[h] = (hashtagCount[h] || 0) + 1; }));
  const topHashtagsFinal = Object.entries(hashtagCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

  return {
    _computed: true,
    account_score: accountScoreFinal,
    buyer_intent_score: buyerIntentScore,
    dashboard: {
      growth_score: Math.min(100, Math.round((avgLikes / 500) * 100)),
      engagement_rate_avg: engRate,
      viral_potential_score: viralPotential,
      best_performing_post: scored[0] || {},
      worst_performing_post: scored[scored.length - 1] || {},
    },
    account_summary: {
      total_posts_analyzed: total,
      avg_likes: avgLikes,
      avg_comments: avgComments,
      avg_views: avgViews,
      top_hashtags: topHashtagsFinal,
      best_hour: `${bestHourFinal}:00`,
    },
    next_post_plan: {
      topic: scored[0]?.topic || "Trending Topic",
      type: scored[0]?.type || "Video",
      time: `${bestHourFinal}:00`,
      hook: "Ready-to-use hook matching your top-performing style.",
      music: "Trending audio in your niche",
      cta: buyerIntentScore > 15 ? "DM for pricing details" : "Follow for daily inspiration"
    },
    advanced_analysis: {
      post_classifications: scored.map((p, i) => ({
        ...p,
        tier: i < Math.ceil(total * 0.25) ? "viral" : i < Math.ceil(total * 0.75) ? "average" : "poor",
      })),
      growth_opportunities: [
        `Optimal Posting: Post around ${bestHourFinal}:00 for maximum reach.`,
        `Hashtag Strategy: Your best tags include ${topHashtagsFinal.slice(0, 2).join(", ") || "niche specific tags"}.`,
        `Monetization: ${buyerIntentScore}% buyer intent detected. Use clear shopping CTAs.`,
      ],
    },
    action_cards: [
      {
        id: "fallback_1",
        type: "engagement",
        title: "Optimal Posting Window",
        priority: "medium",
        confidence_score: 85,
        trigger: `Your engagement peaks between ${bestHourFinal}:00 and ${Number(bestHourFinal) + 2}:00.`,
        action: { primary: `Schedule your next 3 posts at exactly ${bestHourFinal}:00.` },
        ready_to_copy: { hook: "Timing is everything!", caption: "Engagement is highest when you post at the right time. What time is it where you are?", cta: "Comment your timezone below!" },
        post_time: { date: "Today", time: `${bestHourFinal}:00` },
        expected_result: { metric: "+15% engagement", confidence_level: "High" },
        meta: { difficulty: "Easy", estimated_time_to_create: "2m", impact_score: 7, urgency_score: 9 }
      },
      {
        id: "buyer_intent_card",
        type: "sales",
        title: "🔥 High Intent detected",
        priority: "high",
        confidence_score: 95,
        trigger: `${buyerIntentScore}% of recent comments ask about price/availability.`,
        action: { primary: "Add 'DM for details' to your high-intent posts.", secondary: "Pin a comment with pricing info." },
        ready_to_copy: { hook: "Lots of questions about this lately!", caption: "Since so many of you were asking about this piece, I've added all the details to the link in my bio.", cta: "DM me for a direct link!" },
        post_time: { date: "Today", time: "ASAP" },
        expected_result: { metric: "+20% conversion", confidence_level: "High" },
        meta: { difficulty: "Easy", estimated_time_to_create: "1m", impact_score: 9, urgency_score: 10 }
      }
    ]
  };
}

// ─── Express Server ───────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use(express.json());

  app.post("/api/insights", async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });
    if (!process.env.APIFY_API_TOKEN) {
      return res.status(500).json({ error: "APIFY_API_TOKEN is not configured." });
    }

    try {
      const client = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

      // ── STEP 1: Scrape latest posts + reels with comments ─────────────────
      console.log(`[Apify] Scraping data for: ${username}`);
      const run = await client.actor("apify/instagram-scraper").call({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "posts",
        resultsLimit: 12,
        commentsLimit: 30, // Increased for better buyer intent detection
        addParentData: true,
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();

      if (!items || items.length === 0) {
        return res.status(404).json({
          error: "No posts found or profile is private.",
          details: "The scraper couldn't find any recent posts for this username.",
          suggestion: "Check that the account is public and the username is correct.",
        });
      }

      // Profile extraction
      const first: any = items[0];
      const pInfo = first?.owner || first?.user || {};
      const fCount = pInfo.followersCount || pInfo.followers || 0;

      // ── STEP 2: Normalize and Enhance ────────────────────────────────────
      const normalizedPosts = items.map((item: any) => ({
        ...item,
        likesCount: item.likesCount ?? item.likes ?? 0,
        commentsCount: item.commentsCount ?? item.comments ?? 0,
        videoViewCount: item.videoViewCount ?? item.videoPlayCount ?? item.views ?? 0,
        displayUrl: item.displayUrl || item.thumbnailUrl || item.previewUrl || item.url,
        type: item.type || (item.isVideo ? "Video" : "Image"),
        timestamp: item.timestamp ?? item.taken_at_timestamp,
        music_info: item.musicArtist ? `${item.musicArtist} - ${item.musicName}` : null,
        tagged_users: (item.taggedUsers || []).map((u: any) => u.username),
      }));

      const summaryData = normalizedPosts.map((item: any) => ({
        type: item.type,
        like_count: item.likesCount,
        comments_count: item.commentsCount,
        view_count: item.videoViewCount,
        timestamp: item.timestamp,
        caption: (item.caption || "").substring(0, 300),
        hook_text: (item.caption || "").split("\n")[0].substring(0, 80),
        hashtags: item.hashtags || [],
        duration: item.videoDuration || 0,
        music: item.music_info,
        tagged_users: item.tagged_users,
        is_collab: item.tagged_users.length > 0,
        latest_comments: (item.latestComments || []).map((c: any) => ({ text: c.text })),
      }));

      // ── STEP 3: Basic Baseline Dashboard ────────────────────────────────
      const basicInsights = computeBasicInsights(summaryData, fCount);
      console.log(`[Data] Computed baseline with ${fCount} followers.`);

      // ── STEP 4: AI Strategic Analysis ───────────────────────────────────
      let aiInsights: any = null;
      console.log("[AI] Starting Algorithm v2 analysis...");

      const prompt = `You are CORTEX.AI, a Social Intelligence Engine. Analyze using MAXIMUM INSIGHT Algorithm v2.

ACCOUNT: Followers ${fCount}

DATA:
${JSON.stringify(summaryData, null, 2)}

ALGORITHM v2 TASKS:
1. Buyer Intent: detected ${basicInsights.buyer_intent_score}% in baseline. Identify WHICH topics attract buyers.
2. Hook Analysis: Find why the best post hook ("${basicInsights.dashboard.best_performing_post.hook_text || "N/A"}") worked.
3. Viral Signals: Identify patterns in posts exceeding ${basicInsights.account_summary.avg_views * 1.5} views.
4. Posting Plan: Recommend a specific content gap to fill.

Return JSON:
{
  "account_score": 0-100,
  "buyer_intent_score": 0-100,
  "dashboard": {
    "growth_score": 0-100,
    "engagement_rate_avg": "X.XX%",
    "viral_potential_score": 0-100,
    "best_performing_post": { "like_count": 0, "view_count": 0, "caption": "", "hook_text": "" },
    "worst_performing_post": { "like_count": 0, "view_count": 0, "caption": "" }
  },
  "account_summary": {
    "total_posts_analyzed": ${summaryData.length},
    "avg_likes": 0,
    "avg_comments": 0,
    "avg_views": 0,
    "top_hashtags": [],
    "best_hour": ""
  },
  "next_post_plan": {
    "topic": "Strategic topic",
    "type": "Video | Image",
    "time": "HH:MM",
    "hook": "Full hook line",
    "music": "Music strategy",
    "collab": true,
    "cta": "Heavy-hitting CTA"
  },
  "advanced_analysis": {
    "post_classifications": [{ "type": "", "tier": "viral|average|poor", "engagement_score": 0 }],
    "growth_opportunities": ["3 expert observations"]
  },
  "action_cards": [
    {
      "id": "string",
      "type": "growth | sales | engagement | opportunity | warning",
      "title": "Clear Heading",
      "priority": "high | medium | low",
      "confidence_score": 90-100,
      "trigger": "Data-backed reason",
      "action": { "primary": "What to do", "secondary": "Why it's smart" },
      "ready_to_copy": { "hook": "Line 1", "caption": "Body", "cta": "CTA" },
      "post_time": { "date": "Tomorrow", "time": "HH:MM" },
      "expected_result": { "metric": "+X% growth | sales", "confidence_level": "High" },
      "meta": { "difficulty": "Easy", "estimated_time_to_create": "5m", "impact_score": 1-10, "urgency_score": 1-10 }
    }
  ]
}

REQUIRED: 4-6 action_cards. JSON ONLY.`;

      try {
        aiInsights = await callAI(prompt);
      } catch (aiErr: any) {
        console.warn("[AI] Failed, using fallback:", aiErr.message);
      }

      return res.json({
        posts: normalizedPosts,
        insights: aiInsights ?? basicInsights,
        aiUsed: !!aiInsights,
      });

    } catch (error: any) {
      console.error("[Error]", error);
      return res.status(500).json({
        error: "Analysis failed",
        details: error.message,
        suggestion: "Verify API keys and try again.",
      });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
