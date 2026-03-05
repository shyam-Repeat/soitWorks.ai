/**
 * db.ts
 * PocketBase database helper functions for persistent data storage.
 * Collections: profiles, posts, comments, analyses
 */

import PocketBase from "pocketbase";
import dotenv from "dotenv";

dotenv.config();

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8090";

/**
 * Get an authenticated PB instance for DB operations.
 * Uses the provided user token and userId for correct auth scoping.
 */
function getPb(token?: string, userId?: string): PocketBase {
    const instance = new PocketBase(POCKETBASE_URL);
    instance.autoCancellation(false);
    if (token) {
        // If we have a real userId, use it, otherwise use a placeholder that satisfies PB rules
        const idToSave = userId || "authenticated_user";
        instance.authStore.save(token, { id: idToSave } as any);
    }
    return instance;
}

// ─── Profile Operations ───────────────────────────────────────────────────────

export interface ProfileData {
    ig_username: string;
    full_name: string;
    followers_count: number;
    following_count: number;
    posts_count: number;
    profile_pic_url: string;
    category_name: string;
    biography: string;
}

/**
 * Upsert an Instagram profile for a user.
 * If the user already has this ig_username saved, update it; otherwise create.
 */
export async function saveProfile(userId: string, profileData: ProfileData, token: string) {
    const pbClient = getPb(token, userId);

    try {
        // Check if profile already exists for this user + ig_username
        const existing = await pbClient.collection("profiles").getList(1, 1, {
            filter: `user = "${userId}" && ig_username = "${profileData.ig_username}"`,
        });

        if (existing.items.length > 0) {
            // Update existing profile
            const updated = await pbClient.collection("profiles").update(existing.items[0].id, {
                ...profileData,
            });
            return updated;
        } else {
            // Create new profile
            const created = await pbClient.collection("profiles").create({
                user: userId,
                ...profileData,
            });
            return created;
        }
    } catch (err: any) {
        console.error("[DB] saveProfile failed:", err.message);
        throw err;
    }
}

// ─── Post Operations ──────────────────────────────────────────────────────────

export interface PostData {
    ig_post_id: string;
    short_code: string;
    type: string;
    caption: string;
    likes_count: number;
    comments_count: number;
    video_view_count: number;
    play_count: number;
    save_count: number;
    share_count: number;
    display_url: string;
    timestamp: string;
    hashtags: string[];
    url: string;
    duration: number;
    music_info: string | null;
    tagged_users: string[];
}

/**
 * Smart-save posts for a profile.
 * - Optimized to fetch all existing post IDs first.
 * - Only updates if metrics have changed.
 */
export async function savePosts(profileId: string, posts: PostData[], token: string) {
    const pbClient = getPb(token);
    let newCount = 0;
    let updatedCount = 0;

    try {
        // 1. Fetch all existing ig_post_ids for this profile in one go
        const existingRecords = await pbClient.collection("posts").getFullList({
            filter: `profile = "${profileId}"`,
            fields: "id,ig_post_id,likes_count,comments_count,video_view_count"
        });

        const existingMap = new Map(existingRecords.map(r => [r.ig_post_id, r]));

        for (const post of posts) {
            const existing = existingMap.get(post.ig_post_id);

            if (existing) {
                // 2. Only update if metrics actually changed to avoid redundant DB writes
                const changed =
                    existing.likes_count !== post.likes_count ||
                    existing.comments_count !== post.comments_count ||
                    existing.video_view_count !== post.video_view_count;

                if (changed) {
                    await pbClient.collection("posts").update(existing.id, {
                        likes_count: post.likes_count,
                        comments_count: post.comments_count,
                        video_view_count: post.video_view_count,
                        play_count: post.play_count,
                        save_count: post.save_count,
                        share_count: post.share_count,
                    });
                    updatedCount++;
                }
            } else {
                // 3. New post
                await pbClient.collection("posts").create({
                    profile: profileId,
                    ...post,
                });
                newCount++;
            }
        }
    } catch (err: any) {
        console.error("[DB] savePosts bulk operation failed:", err.message);
    }

    return { newCount, updatedCount };
}

// ─── Comment Operations ───────────────────────────────────────────────────────

export interface CommentData {
    text: string;
    owner_username: string;
}

/**
 * Save comments for a post. Skips duplicates by checking text + owner_username.
 */
export async function saveComments(postRecordId: string, comments: CommentData[], token: string) {
    const pbClient = getPb(token);
    let savedCount = 0;

    for (const comment of comments) {
        try {
            // Simple duplicate check
            const existing = await pbClient.collection("comments").getList(1, 1, {
                filter: `post = "${postRecordId}" && owner_username = "${comment.owner_username}" && text = "${comment.text.replace(/"/g, '\\"').substring(0, 100)}"`,
            });

            if (existing.items.length === 0) {
                await pbClient.collection("comments").create({
                    post: postRecordId,
                    text: comment.text,
                    owner_username: comment.owner_username,
                });
                savedCount++;
            }
        } catch (err: any) {
            // Continue with other comments
            console.error(`[DB] saveComments failed:`, err.message);
        }
    }

    return savedCount;
}

// ─── Analysis Operations ──────────────────────────────────────────────────────

export interface AnalysisData {
    insights: any;
    ai_response: any;
    action_cards: any[];
    next_post_plan: any;
}

function parseJsonField<T>(value: any, fallback: T): T {
    if (value == null) return fallback;
    if (typeof value !== "string") return value as T;
    try {
        return JSON.parse(value) as T;
    } catch {
        return fallback;
    }
}

/**
 * Save an analysis run for a user + profile
 */
export async function saveAnalysis(
    userId: string,
    profileId: string,
    analysisData: AnalysisData,
    token: string
) {
    const pbClient = getPb(token, userId);

    try {
        const record = await pbClient.collection("analyses").create({
            user: userId,
            profile: profileId,
            insights: analysisData.insights,
            ai_response: analysisData.ai_response,
            action_cards: analysisData.action_cards,
            next_post_plan: analysisData.next_post_plan,
        });
        return record;
    } catch (err: any) {
        console.error("[DB] saveAnalysis failed:", err.message);
        throw err;
    }
}

/**
 * Get all analyses for a user, newest first
 */
export async function getAnalyses(userId: string, token: string) {
    const pbClient = getPb(token, userId);

    try {
        console.log(`[DB] Fetching analyses for user: ${userId}`);
        const records = await pbClient.collection("analyses").getList(1, 50, {
            filter: `user = "${userId}"`,
            sort: "-id",
            expand: "profile",
        });
        console.log(`[DB] Found ${records.items.length} analyses.`);
        const profileCache = new Map<string, any>();
        const postsCache = new Map<string, any[]>();

        return await Promise.all(records.items.map(async (item) => {
            const insights = parseJsonField<any>(item.insights, {});
            const aiResponse = parseJsonField<any>(item.ai_response, null);
            const actionCards = parseJsonField<any[]>(item.action_cards, []);
            const nextPostPlan = parseJsonField<any>(item.next_post_plan, {});

            let profileRecord = (item.expand as any)?.profile;
            const profileId = Array.isArray((item as any).profile)
                ? (item as any).profile[0]
                : (item as any).profile;

            // Fallback: some legacy records may not return expand.profile, so resolve directly.
            if (!profileRecord && profileId) {
                if (profileCache.has(profileId)) {
                    profileRecord = profileCache.get(profileId);
                } else {
                    try {
                        profileRecord = await pbClient.collection("profiles").getOne(profileId);
                        profileCache.set(profileId, profileRecord);
                    } catch {
                        profileRecord = null;
                    }
                }
            }

            let normalizedPosts: any[] = [];
            if (profileId) {
                if (postsCache.has(profileId)) {
                    normalizedPosts = postsCache.get(profileId) || [];
                } else {
                    try {
                        const postRecords = await pbClient.collection("posts").getFullList({
                            filter: `profile = "${profileId}"`,
                            sort: "-timestamp",
                        });
                        normalizedPosts = postRecords.map((p: any) => ({
                            id: p.ig_post_id || p.id,
                            shortCode: p.short_code || "",
                            type: p.type || "Image",
                            caption: p.caption || "",
                            likesCount: p.likes_count || 0,
                            commentsCount: p.comments_count || 0,
                            videoViewCount: p.video_view_count || 0,
                            playCount: p.play_count || 0,
                            saveCount: p.save_count || 0,
                            shareCount: p.share_count || 0,
                            displayUrl: p.display_url || "",
                            timestamp: p.timestamp || "",
                            hashtags: parseJsonField<string[]>(p.hashtags, []),
                            url: p.url || "",
                            videoDuration: p.duration || 0,
                            music_info: p.music_info || null,
                            tagged_users: parseJsonField<string[]>(p.tagged_users, []),
                            latestComments: [],
                        }));
                    } catch {
                        normalizedPosts = [];
                    }
                    postsCache.set(profileId, normalizedPosts);
                }
            }

            return {
                id: item.id,
                created: item.created,
                ig_username: profileRecord?.ig_username || "unknown",
                profile_pic_url: profileRecord?.profile_pic_url || "",
                profile: {
                    full_name: profileRecord?.full_name || "",
                    followers_count: profileRecord?.followers_count || 0,
                    following_count: profileRecord?.following_count || 0,
                    posts_count: profileRecord?.posts_count || 0,
                    category_name: profileRecord?.category_name || "",
                    biography: profileRecord?.biography || "",
                },
                posts: normalizedPosts,
                insights,
                ai_response: aiResponse,
                action_cards: actionCards,
                next_post_plan: nextPostPlan,
            };
        }));
    } catch (err: any) {
        console.error("[DB] getAnalyses failed:", err.message);
        if (err.data) console.error("[DB] Error details:", JSON.stringify(err.data));
        return [];
    }
}

/**
 * Get existing post IDs for a profile (for smart aggregation)
 */
export async function getExistingPostIds(profileId: string, token: string): Promise<string[]> {
    const pbClient = getPb(token);

    try {
        const records = await pbClient.collection("posts").getList(1, 500, {
            filter: `profile = "${profileId}"`,
            fields: "ig_post_id",
        });
        return records.items.map((item) => (item as any).ig_post_id);
    } catch {
        return [];
    }
}

/**
 * Get a post record by ig_post_id for comment association
 */
export async function getPostRecordId(profileId: string, igPostId: string, token: string): Promise<string | null> {
    const pbClient = getPb(token);

    try {
        const records = await pbClient.collection("posts").getList(1, 1, {
            filter: `profile = "${profileId}" && ig_post_id = "${igPostId}"`,
        });
        return records.items.length > 0 ? records.items[0].id : null;
    } catch {
        return null;
    }
}
