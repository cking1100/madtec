import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PlaylistItem = {
  snippet: {
    title: string;
    publishedAt: string;
    resourceId: { videoId: string };
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
};

type ChannelResponse = {
  items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
};

let cachedVideos:
  | { payload: VideoPayload; expiresAt: number }
  | undefined;

type VideoPayload = {
  configured: boolean;
  videos: Array<{
    id: string;
    title: string;
    publishedAt?: string;
    thumbnail?: string;
    url: string;
    fallback?: boolean;
  }>;
};

function getFallbackVideos(): VideoPayload["videos"] {
  return (process.env.YOUTUBE_FALLBACK_VIDEO_URLS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((value, index) => {
      try {
        const url = new URL(value);
        const isYouTube =
          url.protocol === "https:" &&
          ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(
            url.hostname.toLowerCase(),
          );
        const isVideoUrl =
          url.hostname.toLowerCase() === "youtu.be"
            ? url.pathname.split("/").filter(Boolean).length === 1
            : Boolean(
                url.searchParams.get("v") ||
                  url.pathname.match(/^\/(?:shorts|live|embed)\/[^/]+\/?$/),
              );
        if (!isYouTube || !isVideoUrl) return [];
        return [{
          id: `fallback-${index + 1}`,
          title: "Watch on YouTube",
          url: url.toString(),
          fallback: true,
        }];
      } catch {
        return [];
      }
    });
}

export async function GET() {
  if (cachedVideos && cachedVideos.expiresAt > Date.now()) {
    return NextResponse.json(cachedVideos.payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    return NextResponse.json(
      { configured: false, videos: getFallbackVideos() } satisfies VideoPayload,
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const channelParams = new URLSearchParams({
      part: "contentDetails",
      id: channelId,
      key: apiKey,
    });
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${channelParams}`,
      { next: { revalidate: 300 } },
    );
    if (!channelResponse.ok) {
      throw new Error(`YouTube channel request failed (${channelResponse.status})`);
    }
    const channelData = (await channelResponse.json()) as ChannelResponse;
    const uploadsId = channelData.items?.[0]?.contentDetails.relatedPlaylists.uploads;
    if (!uploadsId) {
      throw new Error("The configured YouTube channel has no uploads playlist.");
    }

    const playlistParams = new URLSearchParams({
      part: "snippet",
      playlistId: uploadsId,
      maxResults: "6",
      key: apiKey,
    });
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams}`,
      { next: { revalidate: 300 } },
    );
    if (!playlistResponse.ok) {
      throw new Error(`YouTube uploads request failed (${playlistResponse.status})`);
    }
    const playlistData = (await playlistResponse.json()) as {
      items?: PlaylistItem[];
    };

    const payload: VideoPayload = {
      configured: true,
      videos: (playlistData.items ?? [])
        .filter((item) => item.snippet.resourceId.videoId)
        .map((item) => {
          const id = item.snippet.resourceId.videoId;
          return {
            id,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            thumbnail:
              item.snippet.thumbnails.high?.url ??
              item.snippet.thumbnails.medium?.url ??
              item.snippet.thumbnails.default?.url ??
              "",
            url: `https://www.youtube.com/watch?v=${id}`,
          };
        }),
    };
    cachedVideos = { payload, expiresAt: Date.now() + 5 * 60_000 };
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    console.error("YouTube uploads request failed:", error);
    return NextResponse.json(
      {
        configured: true,
        videos: getFallbackVideos(),
        error: "YouTube uploads are temporarily unavailable.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
