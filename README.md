# MadTec

A responsive creator site built with Next.js App Router. The live indicator and embedded players only appear when the configured platform APIs confirm an active broadcast. With credentials absent, the site reports that status is unavailable and links directly to each channel.

## Requirements

- Node.js 20.9 or newer
- npm
- A Twitch developer application for live status
- A Google Cloud API key with YouTube Data API v3 enabled for live status and uploads

## Configure locally

1. Copy `.env.example` to `.env.local`.
2. Create a Twitch application at [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps), then add its client ID and client secret to `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET`. Set `TWITCH_CHANNEL_LOGIN` to the channel login (`ohmtec`).
3. In Google Cloud Console, enable YouTube Data API v3, create an API key, and set `YOUTUBE_API_KEY`. Set `YOUTUBE_CHANNEL_ID` to the channel's ID beginning with `UC` (the handle is not a channel ID).
4. Optionally add comma-separated, hand-picked YouTube URLs to `YOUTUBE_FALLBACK_VIDEO_URLS`. These are shown without invented titles or thumbnails if the API is not configured or temporarily fails.
5. Set `NEXT_PUBLIC_SITE_URL` to the public canonical site URL. It is used for metadata; it is not an API secret.
6. Install and run:

   ```bash
   npm install
   npm run dev
   ```

The Twitch embed uses the exact hostname of the page being served as its `parent` parameter. Add that hostname to `TWITCH_EMBED_PARENT_DOMAINS` (comma-separated, with no scheme or port): the example includes common local hostnames, and production deployments must add their actual hostname. This allowlist prevents the app from rendering an embed Twitch cannot serve. Also configure the deployed hostname in the Twitch application's allowed domains / parent domains.

## Deploy

Deploy as a Node.js Next.js application (or use a compatible Next.js host). Configure the same server-side environment variables in the deployment environment and set `NEXT_PUBLIC_SITE_URL` to the production URL. Do not prefix Twitch credentials or the YouTube API key with `NEXT_PUBLIC_`. Restart/redeploy after changing environment values.

`/api/status` checks Twitch Helix with a server-generated app access token and checks YouTube for an active broadcast. Twitch status is cached in-process for 30 seconds; the page refreshes status every 60 seconds. YouTube live searches are cached for 15 minutes because YouTube's search endpoint has a comparatively high quota cost. `/api/videos` fetches up to six actual uploads from the configured channel and caches them for five minutes. If credentials are missing or an upstream service fails, the UI does not claim the channel is live or invent video metadata.
