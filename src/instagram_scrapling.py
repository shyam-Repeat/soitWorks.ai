import sys
import json
import os
import re
import time
import tempfile
from scrapling.fetchers import StealthyFetcher

def map_to_apify_format(user_data, username_context=None):
    data = user_data.get('data', {})
    user = data.get('user', {}) or user_data.get('user', {}) or user_data
    media = user.get('edge_owner_to_timeline_media', {})
    if not media and 'edge_owner_to_timeline_media' in data:
         media = data.get('edge_owner_to_timeline_media')
    if not media and 'edges' in user:
         media = user

    if not media or ('edges' not in media and not user.get('username')):
        return [], {}, None

    username = user.get('username') or username_context
    followers = user.get('edge_followed_by', {}).get('count') or user.get('follower_count') or 0
    following = user.get('edge_follow', {}).get('count') or user.get('following_count') or 0
    posts_total = media.get('count') or user.get('media_count') or 0
    pic = user.get('profile_pic_url_hd') or user.get('profile_pic_url')
    
    common_info = {
        "ownerUsername": username,
        "ownerFullName": user.get('full_name'),
        "followersCount": followers,
        "followsCount": following,
        "postsCount": posts_total,
        "profilePicUrl": pic,
        "biography": user.get('biography'),
    }

    items = []
    edges = media.get('edges', [])
    page_info = media.get('page_info', {})
    
    # Debug: save the first non-empty payload we see to raw_data_debug.json
    if not os.path.exists('raw_data_debug.json') and (edges or user.get('id')):
        try:
            with open('raw_data_debug.json', 'w', encoding='utf-8') as f:
                json.dump(user_data, f, indent=2, ensure_ascii=False)
        except:
            pass

    for edge in edges:
        node = edge.get('node', {})
        if not node: continue
        caption = ""
        caption_edges = node.get('edge_media_to_caption', {}).get('edges', [])
        if caption_edges: caption = caption_edges[0].get('node', {}).get('text', "")

        items.append({
            **common_info,
            "id": node.get('id'),
            "shortCode": node.get('shortcode'),
            "type": "Video" if node.get('is_video') else "Image",
            "caption": caption,
            "likesCount": node.get('edge_media_preview_like', {}).get('count', 0) or node.get('like_count', 0),
            "commentsCount": node.get('edge_media_to_comment', {}).get('count', 0) or node.get('comment_count', 0),
            "videoViewCount": node.get('video_view_count', 0) or node.get('view_count', 0) or 0,
            "playCount": node.get('play_count') or node.get('video_play_count') or 0,
            "saveCount": node.get('edge_media_to_save', {}).get('count', 0) or node.get('save_count') or 0,
            "shareCount": node.get('edge_media_to_reshare', {}).get('count', 0) or node.get('reshare_count') or 0,
            "displayUrl": node.get('display_url'),
            "timestamp": time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime(node.get('taken_at_timestamp', 0) or node.get('taken_at', 0))),
            "latestComments": [],
            "hashtags": re.findall(r'#(\w+)', caption),
            "url": f"https://www.instagram.com/p/{node.get('shortcode') or node.get('code')}/"
        })
    return items, page_info, user.get('id')

def load_cookies(cookie_path):
    if not cookie_path:
        return []
    if not os.path.exists(cookie_path):
        print(f"[Scrapling] Cookie file not found: {cookie_path}", file=sys.stderr)
        return []
    try:
        with open(cookie_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception as e:
        print(f"[Scrapling] Failed to parse cookie file: {e}", file=sys.stderr)
        return []

    if isinstance(raw, dict):
        cookies = raw.get("cookies", [])
    elif isinstance(raw, list):
        cookies = raw
    else:
        cookies = []

    normalized = []
    for c in cookies:
        if not isinstance(c, dict):
            continue
        name = c.get("name")
        value = c.get("value")
        if not name or value is None:
            continue
        normalized.append({
            "name": name,
            "value": value,
            "domain": c.get("domain", ".instagram.com"),
            "path": c.get("path", "/"),
            "expires": c.get("expires", -1),
            "httpOnly": c.get("httpOnly", False),
            "secure": c.get("secure", True),
            "sameSite": c.get("sameSite", "Lax"),
        })
    return normalized

def extract_comments_from_payload(payload):
    seen = set()
    collected = []

    def add_comment(text, owner_username="unknown"):
        if not isinstance(text, str):
            return
        cleaned = text.strip()
        if len(cleaned) < 2 or len(cleaned) > 500:
            return
        key = (owner_username or "unknown", cleaned)
        if key in seen:
            return
        seen.add(key)
        collected.append({
            "text": cleaned,
            "ownerUsername": owner_username or "unknown"
        })

    def walk(node):
        if isinstance(node, list):
            for item in node:
                walk(item)
            return

        if not isinstance(node, dict):
            return

        # Common Instagram comment object signatures.
        text = node.get("text")
        if isinstance(text, str):
            has_comment_shape = any(
                k in node for k in (
                    "comment_id",
                    "comment_like_count",
                    "created_at",
                    "did_report_as_spam",
                    "edge_liked_by",
                    "owner",
                    "user",
                )
            )
            if has_comment_shape:
                owner = node.get("owner") or node.get("user") or {}
                owner_username = owner.get("username") if isinstance(owner, dict) else "unknown"
                add_comment(text, owner_username)

        # Explicit comment containers seen in graphql/mobile API responses.
        for key in (
            "edge_media_to_parent_comment",
            "edge_threaded_comments",
            "edge_media_preview_comment",
            "preview_comments",
            "comments",
        ):
            container = node.get(key)
            if isinstance(container, dict):
                edges = container.get("edges")
                if isinstance(edges, list):
                    for e in edges:
                        if isinstance(e, dict):
                            walk(e.get("node", e))
                nodes = container.get("nodes")
                if isinstance(nodes, list):
                    for n in nodes:
                        walk(n)
                data = container.get("data")
                if isinstance(data, list):
                    for d in data:
                        walk(d)
            elif isinstance(container, list):
                for item in container:
                    walk(item)

        for v in node.values():
            if isinstance(v, (dict, list)):
                walk(v)

    walk(payload)
    return collected

def filter_items(items, content_type):
    ct = (content_type or "all").lower().strip()
    if ct == "reels":
        return [i for i in items if i.get("type") == "Video"]
    if ct == "posts":
        return [i for i in items if i.get("type") == "Image"]
    return items

def scrape_instagram(username, count=20, cookie_path=None, content_type="all", include_comments=True, existing_posts=None):
    if existing_posts is None:
        existing_posts = set()
    print(f"[Scrapling] Targeting {username} for {count} items... (Skipping {len(existing_posts)} existing)", file=sys.stderr)
    items_map = {}
    last_page_info = {}
    session_cookies = load_cookies(cookie_path)
    active_post = {"shortCode": None}
    network_comments = []

    def update_items(new_items, pinfo):
        nonlocal last_page_info
        last_page_info = pinfo
        for it in new_items:
            # Only log if it's actually new
            if it['id'] not in items_map:
                items_map[it['id']] = it
                # Optional: print(f"[Scrapling] New item: {it['id']}", file=sys.stderr)

    # Step 1: Headless session to handle everything
    def run_browser(page):
        # Intercept XHR
        def on_response(response):
            try:
                if response.status != 200:
                    return
                url = response.url

                # Capture profile info from network responses
                if "graphql/query" in url or "web_profile_info" in url:
                    body = response.json()
                    if isinstance(body, dict):
                        items, pinfo, _ = map_to_apify_format(body, username_context=username)
                        if items:
                            # Avoid duplicate logging
                            new_count = len([i for i in items if i['id'] not in items_map])
                            if new_count > 0:
                                print(f"[Scrapling] Caught data from network: {new_count} new items", file=sys.stderr)
                            update_items(items, pinfo)
                
                # Capture comments (can also appear in network JSON)
                if active_post["shortCode"] and (
                    "graphql/query" in url
                    or "/comments/" in url
                    or "xdt_api__v1__media" in url
                ):
                    body = response.json()
                    extracted = extract_comments_from_payload(body)
                    if extracted:
                        network_comments.extend(extracted)
            except: pass
        
        page.on("response", on_response)
        if include_comments:
            print("[Scrapling] Comment extractor initialized and monitoring network...", file=sys.stderr)
        
        # Human-like initial delay
        time.sleep(3.5)

        # LOGINLESS FALLBACK: If network intercept missed the initial payload, 
        # try extracting from the scripts injected in the HTML.
        if not items_map:
            try:
                print("[Scrapling] Checking HTML script tags for initial payload...", file=sys.stderr)
                script_content = page.evaluate('''() => {
                    const scripts = Array.from(document.querySelectorAll('script'));
                    // Look for segments commonly found in shared data or initial data
                    return scripts.find(s => s.textContent.includes('profile_pic_url') || s.textContent.includes('edge_owner_to_timeline_media'))?.textContent || "";
                }''')
                if script_content:
                    # Look for JSON structure in the script
                    match = re.search(r'(\{.*\})', script_content)
                    if match:
                        data = json.loads(match.group(1))
                        items, pinfo, _ = map_to_apify_format(data, username_context=username)
                        if items:
                            print(f"[Scrapling] Caught data from HTML: {len(items)} items", file=sys.stderr)
                            update_items(items, pinfo)
            except Exception as e:
                print(f"[Scrapling] HTML fallback error: {e}", file=sys.stderr)
        
        # Scroll loop
        max_scrolls = 20 if count > 6 else 8
        stale_rounds = 0
        hit_existing = False
        
        current_items = items_map 

        for i in range(max_scrolls):
            if len(current_items) >= count: break
            
            # Check if we hit an existing post
            for it in items_map.values():
                if it.get('shortCode') in existing_posts or it.get('id') in existing_posts:
                    print(f"[Scrapling] Reached already scraped post: {it.get('shortCode')}. Stopping scroll.", file=sys.stderr)
                    hit_existing = True
                    break
            if hit_existing:
                break

            before = len(current_items)
            # More natural scrolling
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(1.5)
            page.evaluate("window.scrollBy(0, -200)")
            time.sleep(0.5)
            
            after = len(current_items)
            if after <= before:
                stale_rounds += 1
            else:
                stale_rounds = 0
            if stale_rounds >= 4: # Be more patient
                break
            if i % 3 == 0: print(f"[Scrapling] Scroll {i}: Total {len(current_items)} items captured", file=sys.stderr)

        if include_comments:
            # Comment extraction
            print(f"[Scrapling] Extracting comments for {min(len(current_items), count)} posts...", file=sys.stderr)
            sorted_items = sorted(list(current_items.values()), key=lambda x: x['timestamp'], reverse=True)
            for it in sorted_items[0:count]:
                if it.get('shortCode') in existing_posts or it.get('id') in existing_posts:
                    continue

                try:
                    active_post["shortCode"] = it.get("shortCode")
                    network_comments.clear()

                    # Navigation with slightly longer timeout
                    page.goto(it['url'], wait_until="domcontentloaded", timeout=45000)
                    time.sleep(2.5)

                    # Try opening more comments if a button is visible.
                    # FIXED: Added async to the evaluator function
                    page.evaluate('''async () => {
                        const wanted = [/view all/i, /more comments/i, /view more/i, /load more/i];
                        for (let i = 0; i < 5; i++) {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const btn = buttons.find(b => {
                                const t = (b.innerText || '').trim();
                                return wanted.some(r => r.test(t));
                            });
                            if (!btn) break;
                            btn.click();
                            await new Promise(resolve => setTimeout(resolve, 1500));
                        }
                    }''')
                    time.sleep(2)

                    MAX_COMMENTS = 50
                    comment_objs = network_comments[0:MAX_COMMENTS]
                    if not comment_objs or len(comment_objs) < 3:
                        # Fallback 1: Embedded JSON scripts (often present in unauthenticated view)
                        script_comments = page.evaluate('''() => {
                            const scripts = Array.from(document.querySelectorAll('script[type="application/json"]'));
                            // Just return the contents to avoid huge transfers, we will parse them locally
                            return scripts.map(s => s.textContent).filter(t => t.includes('"text":"') && (t.includes('comment') || t.includes('xdt_api')));
                        }''')
                        for content in script_comments:
                            try:
                                j = json.loads(content)
                                extracted = extract_comments_from_payload(j)
                                if extracted:
                                    for ec in extracted:
                                        if not any(co['text'] == ec['text'] for co in comment_objs):
                                            comment_objs.append(ec)
                                            if len(comment_objs) >= MAX_COMMENTS: break
                            except: pass
                            if len(comment_objs) >= MAX_COMMENTS: break

                    if not comment_objs:
                        # Fallback 2: DOM fallback when everything else fails.
                        comment_objs = page.evaluate('''(max_c) => {
                            const out = [];
                            const seen = new Set();
                            const ban = [/^follow$/i, /^reply$/i, /^liked by/i, /^view replies/i];
                            const rows = Array.from(document.querySelectorAll('article ul ul li'));
                            for (const row of rows) {
                                const userEl = row.querySelector('h3 a, h3, a[href^="/"]');
                                const ownerUsername = (userEl?.textContent || 'unknown').trim().replace(/^@/, '') || 'unknown';
                                const spans = Array.from(row.querySelectorAll('span'));
                                let text = '';
                                for (const s of spans) {
                                    const t = (s.textContent || '').trim();
                                    if (!t) continue;
                                    if (ban.some(r => r.test(t))) continue;
                                    if (t.length < 2 || t.length > 500) continue;
                                    // Keep the longest candidate in the row; usually actual comment text.
                                    if (t.length > text.length) text = t;
                                }
                                if (!text) continue;
                                const key = ownerUsername + '|' + text;
                                if (seen.has(key)) continue;
                                seen.add(key);
                                out.push({ text, ownerUsername });
                                if (out.length >= max_c) break;
                            }
                            return out;
                        }''', MAX_COMMENTS) or []

                    if comment_objs:
                        it['latestComments'] = comment_objs[0:MAX_COMMENTS]
                        print(f"[Scrapling] Captured {len(it['latestComments'])} comments for {it.get('shortCode')}", file=sys.stderr)
                    else:
                        print(f"[Scrapling] No comments captured for {it.get('shortCode')}", file=sys.stderr)
                except Exception as e:
                    print(f"[Scrapling] Comment extraction failed for {it.get('shortCode')}: {e}", file=sys.stderr)
                finally:
                    active_post["shortCode"] = None

    try:
        # Use a persistent temp dir per user to build trust with Instagram
        tmp_dir = os.path.join(tempfile.gettempdir(), f"instainsight_{username}")
        StealthyFetcher.fetch(
            f"https://www.instagram.com/{username}/",
            headless=True,
            page_action=run_browser,
            user_data_dir=tmp_dir,
            timeout=180000,
            solve_cloudflare=True,
            google_search=True
        )
    except Exception as e:
        print(f"[Scrapling] Browser run failed: {e}", file=sys.stderr)

    res = list(items_map.values())
    res.sort(key=lambda x: x['timestamp'], reverse=True)
    res = filter_items(res, content_type)
    
    if last_page_info:
        with open('pagination_info.json', 'w') as f:
            json.dump(last_page_info, f)
            
    return res[0:count]

if __name__ == "__main__":
    u = sys.argv[1] if len(sys.argv) > 1 else ""
    cookie_path = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "NONE" else None
    content_type = sys.argv[3] if len(sys.argv) > 3 else "all"
    n = int(sys.argv[4]) if len(sys.argv) > 4 else 12
    include_comments = sys.argv[5] != "0" if len(sys.argv) > 5 else True
    existing_posts_arg = sys.argv[6] if len(sys.argv) > 6 else "NONE"
    
    existing_posts = set(existing_posts_arg.split(',')) if existing_posts_arg != "NONE" and existing_posts_arg else set()
    
    results = scrape_instagram(
        u,
        count=n,
        cookie_path=cookie_path,
        content_type=content_type,
        include_comments=include_comments,
        existing_posts=existing_posts
    )
    
    # Debug dump to local file as requested
    try:
        with open('scraped_data_debug.json', 'w', encoding='utf-8') as f:
            json.dump({
                "username": u,
                "timestamp": time.ctime(),
                "count": len(results),
                "items": results
            }, f, indent=2, ensure_ascii=False)
        print(f"[Scrapling] Debug dump saved to scraped_data_debug.json", file=sys.stderr)
    except Exception as e:
        print(f"[Scrapling] Failed to save debug dump: {e}", file=sys.stderr)

    print(json.dumps(results))
