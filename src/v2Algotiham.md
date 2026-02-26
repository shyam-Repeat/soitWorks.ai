============================================================
MAXIMUM INSIGHT + ACTION + DASHBOARD ALGORITHM v2
============================================================

INPUT:
Scraped Profile Data (TWO scrapes required)

SCRAPE A — Profile Level:
  followers
  following
  postsCount

SCRAPE B — Posts Level:
  posts[]
    likes
    comments[]         ← full text, not just count
    commentsCount
    views              ← videos only, null for photos
    videoPlayCount     ← videos only
    caption
    timestamp
    type (Video / Sidecar / Image)
    hashtags[]
    taggedUsers[]
    locationName
    musicInfo

============================================================
STEP 0: HANDLE MISSING DATA SAFELY
============================================================

BEFORE any calculation:

IF followers = null OR followers = 0:

  HALT rate calculations

  SHOW WARNING:
  "Profile follower count missing.
   Run profile scrape first."

  FALL BACK to:
  rank posts by raw likes + comments only


FOR each post:

  IF type = Video:
    views_available = TRUE
    use: videoViewCount OR videoPlayCount (whichever is higher)

  IF type = Sidecar OR Image:
    views_available = FALSE
    views = null
    skip all view-based metrics


============================================================
STEP 1: PREPROCESS DATA (TYPE-AWARE SCORING)
============================================================

FOR each post:

  engagement_rate =
  (likes + commentsCount) / followers * 100


  IF views_available = TRUE:

    view_rate = views / followers * 100

    comment_rate = commentsCount / views * 100

    like_rate = likes / views * 100

    performance_score =
    (
      engagement_rate * 0.4
      +
      view_rate       * 0.3
      +
      comment_rate    * 0.2
      +
      like_rate       * 0.1
    )

  ELSE:

    performance_score =
    (
      engagement_rate * 0.7
      +
      comment_rate_proxy * 0.3
    )

    comment_rate_proxy =
    commentsCount / likes * 100
    (measures comment quality relative to reach)


  SAVE post.performance_score
  SAVE post.type
  SAVE post.views_available


============================================================
STEP 2: BUYER INTENT DETECTION  ← NEW
============================================================

BUYER_INTENT_KEYWORDS = [
  "price", "pp", "cost", "how much", "rate",
  "available", "dm", "where", "buy", "shop",
  "whatsapp", "contact", "booking"
]

FOR each post:

  buyer_comments = 0

  FOR each comment in post.comments:

    IF comment.text contains any BUYER_INTENT_KEYWORD:
      buyer_comments += 1

  post.buyer_intent_score = buyer_comments / commentsCount * 100


FIND:

  high_intent_posts =
  posts WHERE buyer_intent_score > 20%

  IF high_intent_posts exist:

    CREATE ACTION CARD:

    TITLE: 🔥 Hot Buyer Interest

    ACTION:
    "X people asked about price on [post].
     Add price range or 'DM for price' CTA
     directly in caption — don't make them ask."


============================================================
STEP 3: FIND BEST AND WORST CONTENT
============================================================

best_post  = MAX(post.performance_score)
worst_post = MIN(post.performance_score)

SAVE:

  best_post_type
  best_post_topic
  best_post_hook        ← first line of caption
  best_post_hashtags[]
  best_post_music       ← musicInfo.song_name if Video

  worst_post_type
  worst_post_topic


============================================================
STEP 4: FIND CONTENT PATTERN
============================================================

GROUP posts by:

  topic             ← extracted from caption keywords
  content_type      ← Video / Sidecar / Image
  posting_time_hour ← from timestamp
  collab_post       ← taggedUsers.length > 2 = TRUE

CALCULATE:

  average performance per group


FIND:

  best_topic
  best_content_type
  best_posting_hour

  collab_avg_score   = avg score WHERE collab_post = TRUE
  solo_avg_score     = avg score WHERE collab_post = FALSE

  IF collab_avg_score > solo_avg_score * 1.2:

    CREATE ACTION CARD:

    TITLE: 🤝 Collab Boost Detected

    ACTION:
    "Posts with 3+ tagged creators perform
     X% better. Plan your next shoot as a collab."


============================================================
STEP 5: FIND VIRAL SIGNALS
============================================================

FOR each post:

  IF engagement_rate > avg_engagement_rate * 1.5:
    viral_candidate = TRUE

  IF views_available = TRUE:
    IF view_rate > avg_view_rate * 1.5:
      viral_candidate = TRUE

COUNT viral_candidates

IF viral_candidates > 0:

  CREATE ACTION CARD:

  TITLE: 🚀 Viral Opportunity

  ACTION:
  "Post similar to [best_post] immediately.
   Same outfit type, same hook style, same music genre."


============================================================
STEP 6: FIND FOLLOWER CONVERSION PROBLEM
============================================================

IF followers available:

  IF (avg video views > followers * 0.5)
  AND (recent follower growth slow):

    CREATE ACTION CARD:

    TITLE: 📌 Follow CTA Missing

    ACTION:
    "Add 'Follow for daily bridal inspiration'
     in first 3 lines of caption."

ELSE:

  SKIP this step
  (cannot calculate without follower count)


============================================================
STEP 7: FIND HOOK PROBLEM
============================================================

ANALYZE best_post_hook vs worst_post_hook:

  SHORT HOOK (< 8 words) = hook_type: punchy
  LONG HOOK (> 15 words) = hook_type: descriptive

  IF punchy hooks outperform descriptive hooks:

    CREATE ACTION CARD:

    TITLE: ✍️ Hook Fix

    ACTION:
    "Your short hooks outperform long ones.
     Keep first line under 8 words.
     Example: 'Tickled pink and feeling like a million bucks.'"


============================================================
STEP 8: FIND CONTENT GAP
============================================================

IF best_topic posted < 2x per month:

  CREATE ACTION CARD:

  TITLE: 📅 Content Gap

  ACTION:
  "Post more [best_topic].
   You post it rarely but it performs best."


============================================================
STEP 9: FIND POSTING TIME OPTIMUM
============================================================

FIND: hour with best average performance_score

RECOMMEND: post 30 mins before that hour

NOTE: also check day of week
  IF weekday posts outperform weekend posts: flag it


============================================================
STEP 10: FIND MUSIC PATTERN  ← NEW
============================================================

FOR Video posts only:

  GROUP by musicInfo.uses_original_audio

  IF trending_song_posts avg score
  > original_audio_posts avg score:

    RECOMMEND: use trending audio

  ELSE:

    RECOMMEND: original audio is working, keep using it

  FIND: song_name used in best performing video

  ADD to next post plan:
  "Use similar music genre to: [best_post_music]"


============================================================
STEP 11: GENERATE NEXT POST RECOMMENDATION
============================================================

NEXT POST PLAN:

  topic   = best_topic
  type    = best_content_type (likely Video)
  time    = best_posting_hour
  hook    = short punchy style from best_post_hook pattern
  music   = genre matching best_post_music
  collab  = TRUE if collab boost detected
  cta     = price inquiry CTA if buyer_intent detected

OUTPUT: NEXT POST PLAN


============================================================
STEP 12: GENERATE ACTION CARDS (UPDATED SET)
============================================================

CARD 1:
  TITLE: 🚀 Viral Opportunity
  ACTION: Post similar to best post (type + hook + music)

CARD 2:
  TITLE: ⏰ Best Posting Time
  ACTION: Post at best_posting_hour on best_day

CARD 3:
  TITLE: 📅 Content Gap
  ACTION: Post more best_topic

CARD 4:
  TITLE: ✍️ Hook Improvement
  ACTION: Use punchy hook under 8 words

CARD 5:
  TITLE: 📌 Follower Growth
  ACTION: Add follow CTA in caption
  (only show if follower data available)

CARD 6: ← NEW
  TITLE: 🔥 Buyer Intent Alert
  ACTION: Add price CTA to high-intent posts

CARD 7: ← NEW
  TITLE: 🤝 Collab Boost
  ACTION: Plan next shoot as collab if pattern detected

CARD 8: ← NEW
  TITLE: 🎵 Music Signal
  ACTION: Use trending / original audio based on data


============================================================
STEP 13: DASHBOARD UI DATA
============================================================

TOP SECTION:

  followers              (from profile scrape)
  avg engagement_rate    (from posts)
  best_post preview
  growth_rate            (only if historical data available)
                         ELSE: show "N/A — rescrape weekly"

MIDDLE SECTION:

  NEXT POST PLAN
    hook
    caption
    time
    music suggestion
    collab flag

BOTTOM SECTION:

  Action Cards (priority ordered by impact score)


============================================================
STEP 14: USER FEEL ALGORITHM
============================================================

RULE: NEVER SHOW RAW NUMBERS ALONE

BAD:
  "Engagement rate: 5.2%"

GOOD:
  "Your reels are getting strong traction.
   Post similar content tomorrow at 7 PM."

BAD:
  "buyer_intent_score: 34%"

GOOD:
  "People are asking about prices on this post.
   Add a price CTA — you're losing buyers."


============================================================
STEP 15: SCORE USER ACCOUNT
============================================================

IF followers available:

  growth_score      = (recent follower delta / followers) * 100
  engagement_score  = avg engagement_rate normalized 0–100
  viral_score       = viral_candidate count / total posts * 100
  conversion_score  = buyer_intent posts / total posts * 100  ← NEW
  content_mix_score = video % of posts * 100                  ← NEW

  account_score = weighted average of all five

  SHOW: Account Score: XX / 100

ELSE:

  SHOW: "Connect profile scrape to unlock Account Score"


============================================================
STEP 16: GENERATE READY TO COPY CONTENT
============================================================

GENERATE:

  Hook     ← punchy, under 8 words, based on best_post pattern
  Caption  ← includes product detail + story + CTA
  CTA      ← "DM for price" OR "Book video call" OR "Follow for more"
  Hashtags ← top performing hashtags from best posts


============================================================
FINAL OUTPUT TO USER
============================================================

Dashboard shows:

  Account Score
  Next Post Plan (hook + caption + time + music)
  Action Cards (priority ordered)
  Best Content
  Buyer Intent Alert   ← NEW
  Growth Opportunity


============================================================
CORE PRINCIPLE
============================================================

DATA → INSIGHT → ACTION → READY POST

NOT

DATA → DATA

============================================================
DATA REQUIREMENTS CHECKLIST
============================================================

REQUIRED (algorithm breaks without these):
  [ ] followers count         ← profile scrape
  [ ] posts with likesCount
  [ ] posts with commentsCount
  [ ] post timestamps
  [ ] post type (Video/Sidecar/Image)

REQUIRED FOR VIDEO SCORING:
  [ ] videoViewCount OR videoPlayCount

ENHANCED (improves output quality):
  [ ] full comment text        ← buyer intent detection
  [ ] taggedUsers[]            ← collab detection
  [ ] musicInfo                ← music pattern analysis
  [ ] historical scrapes       ← growth rate calculation

NEVER AVAILABLE FROM SCRAPING:
  [ ] save_rate                ← removed from algorithm
  [ ] story views
  [ ] reach (non-followers)

============================================================
END
============================================================