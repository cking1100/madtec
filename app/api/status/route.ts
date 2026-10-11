import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TwitchStream = {
  id: string;
  title: string;
  viewer_count: number;
  started_at: string;
  game_name: string;
  thumbnail_url: string;
};

type YouTubeVideo = {
  id: { videoId?: string };
  snippet: { title: string; channelTitle: string };
};

let twitchToken: { value: string; expiresAt: number } | undefined;
let cachedStatus:
  | { value: StatusPayload; expiresAt: number }
  | undefined;
let cachedYouTubeStatus:
  | { value: PlatformStatus; expiresAt: number }
  | undefined;

type PlatformStatus = {
  configured: boolean;
  available: boolean;
  live: boolean;
  title: string | null;
  url: string;
  videoId?: string;
  embedChannel?: string;
  embedParentDomains?: string[];
};

type StatusPayload = {
  twitch: PlatformStatus;
  youtube: PlatformStatus;
  checkedAt: string;
};

const unavailableStatus = (url: string): PlatformStatus => ({
  configured: false,
  available: false,
  live: false,
  title: null,
  url,
});

async function getTwitchToken(clientId: string, clientSecret: string) {
  if (twitchToken && twitchToken.expiresAt > Date.now() + 60_000) {
    return twitchToken.value;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Twitch token request failed (${response.status})`);
  }

  const token = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  twitchToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  return twitchToken.value;
}

async function getTwitchStatus(): Promise<PlatformStatus> {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const channel = process.env.TWITCH_CHANNEL_LOGIN;
  const url = `https://www.twitch.tv/${channel || "ohmtec"}`;
  const embedParentDomains = (process.env.TWITCH_EMBED_PARENT_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  if (!clientId || !clientSecret || !channel) {
    return { ...unavailableStatus(url), embedParentDomains };
  }

  try {
    const token = await getTwitchToken(clientId, clientSecret);
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(channel)}`,
      {
        headers: {
          "Client-Id": clientId,
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Twitch stream request failed (${response.status})`);
    }

    const result = (await response.json()) as { data: TwitchStream[] };
    const stream = result.data[0];
    return {
      configured: true,
      available: true,
      live: Boolean(stream),
      title: stream?.title ?? null,
      url,
      embedChannel: channel,
      embedParentDomains,
      ...(stream ? { videoId: stream.id } : {}),
    };
  } catch (error) {
    console.error("Twitch status check failed:", error);
    return { ...unavailableStatus(url), configured: true };
  }
}

async function getYouTubeStatus(): Promise<PlatformStatus> {
  if (cachedYouTubeStatus && cachedYouTubeStatus.expiresAt > Date.now()) {
    return cachedYouTubeStatus.value;
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const url = "https://www.youtube.com/@madtec";

  if (!apiKey || !channelId) {
    return unavailableStatus(url);
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      channelId,
      eventType: "live",
      type: "video",
      maxResults: "1",
      key: apiKey,
    });
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
      { next: { revalidate: 900 } },
    );

    if (!response.ok) {
      throw new Error(`YouTube live search failed (${response.status})`);
    }

    const result = (await response.json()) as { items?: YouTubeVideo[] };
    const liveVideo = result.items?.[0];
    const videoId = liveVideo?.id.videoId;
    const value: PlatformStatus = {
      configured: true,
      available: true,
      live: Boolean(videoId),
      title: liveVideo?.snippet.title ?? null,
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : url,
      ...(videoId ? { videoId } : {}),
    };
    cachedYouTubeStatus = { value, expiresAt: Date.now() + 15 * 60_000 };
    return value;
  } catch (error) {
    console.error("YouTube status check failed:", error);
    const value = { ...unavailableStatus(url), configured: true };
    cachedYouTubeStatus = { value, expiresAt: Date.now() + 15 * 60_000 };
    return value;
  }
}

export async function GET() {
  if (cachedStatus && cachedStatus.expiresAt > Date.now()) {
    return NextResponse.json(cachedStatus.value, {
      headers: { "Cache-Control": "private, max-age=20" },
    });
  }

  const [twitch, youtube] = await Promise.all([
    getTwitchStatus(),
    getYouTubeStatus(),
  ]);
  const value: StatusPayload = {
    twitch,
    youtube,
    checkedAt: new Date().toISOString(),
  };
  cachedStatus = { value, expiresAt: Date.now() + 30_000 };

  return NextResponse.json(value, {
    headers: { "Cache-Control": "private, max-age=20" },
  });
}
