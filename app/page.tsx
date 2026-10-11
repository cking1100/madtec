"use client";

import { useCallback, useEffect, useState } from "react";

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

type Video = {
  id: string;
  title: string;
  publishedAt?: string;
  thumbnail?: string;
  url: string;
  fallback?: boolean;
};

type VideoPayload = {
  configured: boolean;
  videos: Video[];
  error?: string;
};

const twitchFallback: PlatformStatus = {
  configured: false,
  available: false,
  live: false,
  title: null,
  url: "https://www.twitch.tv/ohmtec",
};
const youtubeFallback: PlatformStatus = {
  configured: false,
  available: false,
  live: false,
  title: null,
  url: "https://www.youtube.com/@madtec",
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`}>
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 36 36" role="presentation">
          <path d="M3 4h12v8H9v5h8v7H9v8H3V4Zm18 0h12v8h-6v5h6v7h-6v8h-6V4Z" />
          <path className="brand-cutout" d="M15 12h6v7h-6z" />
        </svg>
      </span>
      <span className="brand-word">MADTEC<span className="brand-period">.</span></span>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="arrow-icon">
      <path d="M3.5 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 2 2 6v14h5v3h4l3-3h4l4-5V2H4Zm16 12-3 3h-4l-3 3v-3H6V4h14v10Z" />
      <path d="M12 7h2v5h-2zm5 0h2v5h-2z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" />
    </svg>
  );
}

function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function LivePip({
  live,
  available = true,
}: {
  live: boolean;
  available?: boolean;
}) {
  return (
    <span className={`live-pip${live ? " live-pip--on" : ""}`}>
      <span aria-hidden="true" />
      {live ? "ON AIR" : available ? "OFFLINE" : "STATUS N/A"}
    </span>
  );
}

function PlatformPlayer({
  platform,
  status,
}: {
  platform: "Twitch" | "YouTube";
  status: PlatformStatus;
}) {
  if (platform === "Twitch" && status.live) {
    const parent = typeof window === "undefined" ? "" : window.location.hostname;
    if (!status.embedParentDomains?.includes(parent.toLowerCase())) {
      return (
        <div className="player-placeholder">
          <p className="eyebrow">BROADCAST FOUND / EMBED NOT ENABLED</p>
          <p className="player-note">
            Add this site hostname to TWITCH_EMBED_PARENT_DOMAINS to enable the embedded player.
          </p>
          <ExternalLink href={status.url} className="text-link">
            Watch on Twitch <ArrowIcon />
          </ExternalLink>
        </div>
      );
    }
    return (
      <iframe
        className="stream-iframe"
        src={`https://player.twitch.tv/?channel=${encodeURIComponent(status.embedChannel ?? "ohmtec")}&parent=${encodeURIComponent(parent)}&autoplay=false&muted=true`}
        title="MadTec live on Twitch"
        allowFullScreen
        allow="autoplay; fullscreen"
      />
    );
  }

  if (platform === "YouTube" && status.live && status.videoId) {
    return (
      <iframe
        className="stream-iframe"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(status.videoId)}?autoplay=0`}
        title={status.title ?? "MadTec live on YouTube"}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <div className="player-placeholder">
      <div className="signal-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">NO ACTIVE TRANSMISSION</p>
      <p className="player-note">
        {status.available
          ? "The channel is quiet right now. Check back when the signal returns."
          : "Live status is unavailable at the moment. Visit the channel for the latest."}
      </p>
      <ExternalLink href={status.url} className="text-link">
        Visit {platform} <ArrowIcon />
      </ExternalLink>
    </div>
  );
}

export default function Home() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [videos, setVideos] = useState<VideoPayload | null>(null);
  const [activePlatform, setActivePlatform] = useState<"Twitch" | "YouTube">("Twitch");
  const [statusError, setStatusError] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error("Status request failed");
      const result = (await response.json()) as StatusPayload;
      setStatus(result);
      setStatusError(false);
      if (!result.twitch.live && result.youtube.live) setActivePlatform("YouTube");
      else if (result.twitch.live) setActivePlatform("Twitch");
    } catch {
      setStatusError(true);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
    const timer = window.setInterval(() => void refreshStatus(), 60_000);
    return () => window.clearInterval(timer);
  }, [refreshStatus]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/videos")
      .then(async (response) => {
        if (!response.ok) throw new Error("Uploads request failed");
        return (await response.json()) as VideoPayload;
      })
      .then((result) => {
        if (!cancelled) setVideos(result);
      })
      .catch(() => {
        if (!cancelled) setVideos({ configured: true, videos: [], error: "Uploads could not be loaded." });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const twitch = status?.twitch ?? twitchFallback;
  const youtube = status?.youtube ?? youtubeFallback;
  const isLive = twitch.live || youtube.live;
  const statusComplete = Boolean(status && twitch.available && youtube.available);
  const current = activePlatform === "Twitch" ? twitch : youtube;
  const primaryStream = twitch.live ? twitch : youtube.live ? youtube : null;
  const currentLabel = !status
    ? "CHECKING SIGNAL"
    : isLive
      ? "LIVE TRANSMISSION"
      : statusError || !statusComplete
        ? "STATUS UNAVAILABLE"
        : "BETWEEN TRANSMISSIONS";

  return (
    <>
      <header className="site-header">
        <a href="#top" aria-label="MadTec home" className="header-brand">
          <BrandMark compact />
        </a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#live">Live</a>
          <a href="#videos">Videos</a>
          <a href="#about">About</a>
        </nav>
        <div className="header-right">
          <a className="header-social" href="https://www.twitch.tv/ohmtec" target="_blank" rel="noreferrer">TWITCH <span>↗</span></a>
          <a className="header-social" href="https://www.youtube.com/@madtec" target="_blank" rel="noreferrer">YOUTUBE <span>↗</span></a>
          <span className="header-live"><LivePip live={isLive} available={statusComplete} /></span>
        </div>
        <details className="mobile-nav">
          <summary aria-label="Open navigation"><span /><span /></summary>
          <nav
            aria-label="Mobile navigation"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) {
                const details = event.currentTarget.closest("details");
                if (details) details.open = false;
              }
            }}
          >
            <a href="#live">Live</a>
            <a href="#videos">Videos</a>
            <a href="#about">About</a>
            <a href="https://www.twitch.tv/ohmtec" target="_blank" rel="noreferrer">Twitch ↗</a>
            <a href="https://www.youtube.com/@madtec" target="_blank" rel="noreferrer">YouTube ↗</a>
          </nav>
        </details>
      </header>

      <main id="top">
        <section className="hero page-grid">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="signal-status"><span className="signal-dot" /> PERSONAL FREQUENCY / 001</span>
              <span>INDEPENDENT / SIGNAL</span>
            </div>
            <div className="hero-title-wrap">
              <h1>MAD<span className="title-cut">T</span>EC<span className="title-period">.</span></h1>
              <div className="hero-glyph" aria-hidden="true">
                <BrandMark />
                <span className="glyph-caption">MT—01<br />LIVE SYSTEM</span>
              </div>
            </div>
            <div className="hero-bottom">
              <div className="hero-intro">
                <p className="hero-manifesto">INDEPENDENT CREATOR.<br />ONLINE WHENEVER.</p>
                <p className="hero-description">A home for live broadcasts, things made between them, and whatever comes next.</p>
              </div>
              <a href="#live" className="hero-jump">
                <span>FIND THE SIGNAL</span>
                <span className="jump-icon" aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="hero-index"><span>01 / 04</span><span>INDEPENDENT BY DESIGN</span><span>FREQ / OPEN</span></div>
          </div>

          <aside className="hero-transmission" aria-label="Current stream status">
            <div className="transmission-head">
              <span className="eyebrow">CURRENT FREQUENCY</span>
              <LivePip live={isLive} available={statusComplete} />
            </div>
            <div className="transmission-visual">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
              <div className="transmission-core"><BrandMark compact /><span className="core-line" /></div>
              <span className="orbit-coordinate orbit-coordinate--one">MT—01</span>
              <span className="orbit-coordinate orbit-coordinate--two">TX / {isLive ? "ON" : "STBY"}</span>
              <span className="crosshair crosshair--a" /><span className="crosshair crosshair--b" />
            </div>
            <div className="transmission-foot">
              <span>{currentLabel}</span>
              <span>{primaryStream?.title ?? (statusComplete ? "NO ACTIVE TRANSMISSION" : "STATUS UNAVAILABLE")}</span>
              {primaryStream && <a href="#live">ENTER BROADCAST <ArrowIcon /></a>}
              {!primaryStream && (
                <ExternalLink href="https://www.twitch.tv/ohmtec">OPEN CHANNEL <ArrowIcon /></ExternalLink>
              )}
            </div>
            <div className="transmission-code">M-TEK / SIGNAL PATH: {statusError ? "UNAVAILABLE" : "AUTO"}</div>
          </aside>
        </section>

        <section className="live-section section-shell" id="live">
          <div className="section-heading">
            <div className="section-marker"><span>01</span><span>LIVE / FEED</span></div>
            <div className="section-title-row">
              <div><p className="eyebrow">LIVE BROADCAST</p><h2>On the <em>air.</em></h2></div>
              <p className="section-aside">One signal, two possible frequencies.<br />Pick your platform and tune in.</p>
            </div>
          </div>
          <div className="live-layout">
            <div className="player-column">
              <div className="player-frame">
                <div className="player-topline">
                  <span><i className={current.live ? "player-indicator player-indicator--live" : "player-indicator"} /> {current.live ? "TRANSMITTING" : "SIGNAL MONITOR"}</span>
                  <span>FORMAT 16:9 / FEED 0{activePlatform === "Twitch" ? "1" : "2"}</span>
                </div>
                <div className="player-content" key={`${activePlatform}-${current.videoId ?? current.live}`}>
                  <PlatformPlayer platform={activePlatform} status={current} />
                </div>
              </div>
              <div className="player-caption">
                <div>
                  <span className="eyebrow">{activePlatform} / {current.live ? "LIVE NOW" : current.available ? "OFFLINE" : "STATUS UNAVAILABLE"}</span>
                  <h3>{current.live ? current.title : "Nothing on the line. Yet."}</h3>
                </div>
                <ExternalLink href={current.url} className="outline-link">
                  OPEN ON {activePlatform.toUpperCase()} <ArrowIcon />
                </ExternalLink>
              </div>
            </div>
            <aside className="platform-panel">
              <div className="panel-heading"><span className="eyebrow">AVAILABLE CHANNELS</span><span>SELECT ONE ↴</span></div>
              <button
                type="button"
                className={`platform-option${activePlatform === "Twitch" ? " platform-option--selected" : ""}`}
                onClick={() => setActivePlatform("Twitch")}
                aria-pressed={activePlatform === "Twitch"}
              >
                <span className="platform-index">01</span>
                <span className="platform-info"><strong>Twitch</strong><small>twitch.tv/ohmtec</small></span>
                <LivePip live={twitch.live} available={twitch.available} />
                <span className="platform-arrow">↗</span>
              </button>
              <button
                type="button"
                className={`platform-option${activePlatform === "YouTube" ? " platform-option--selected" : ""}`}
                onClick={() => setActivePlatform("YouTube")}
                aria-pressed={activePlatform === "YouTube"}
              >
                <span className="platform-index">02</span>
                <span className="platform-info"><strong>YouTube</strong><small>youtube.com/@madtec</small></span>
                <LivePip live={youtube.live} available={youtube.available} />
                <span className="platform-arrow">↗</span>
              </button>
              <div className="panel-note">
                <span className="note-symbol">i</span>
                <p>{statusError || !statusComplete
                  ? "Live status is not configured or could not be reached. Try a channel directly."
                  : "Twitch refreshes each minute; YouTube live checks are cached to conserve API quota."}</p>
              </div>
              <div className="panel-refresh"><span>STATUS CHECK</span><span>{status?.checkedAt ? new Date(status.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "WAITING"}</span></div>
            </aside>
          </div>
        </section>

        <section className="video-section section-shell" id="videos">
          <div className="section-heading">
            <div className="section-marker"><span>02</span><span>ARCHIVE / RECENT</span></div>
            <div className="section-title-row">
              <div><p className="eyebrow">FROM THE ARCHIVE</p><h2>After the <em>signal.</em></h2></div>
              <ExternalLink href="https://www.youtube.com/@madtec" className="text-link archive-link">ALL UPLOADS <ArrowIcon /></ExternalLink>
            </div>
          </div>
          {!videos && (
            <div className="video-empty video-empty--loading" aria-live="polite">
              <span className="loading-line" /><span className="eyebrow">TUNING INTO THE ARCHIVE</span>
            </div>
          )}
          {videos && videos.videos.length > 0 && (
            <div className="video-list">
              {videos.videos.map((video, index) => (
                <ExternalLink href={video.url} className="video-item" key={video.id}>
                  <span className="video-number">0{index + 1}</span>
                  <span className="video-thumb">
                    {video.thumbnail ? (
                      <img src={video.thumbnail} alt="" loading="lazy" />
                    ) : (
                      <span className="thumb-placeholder" aria-hidden="true">YT / LINK</span>
                    )}
                    <span className="thumb-play">↗</span>
                  </span>
                  <span className="video-meta"><span className="eyebrow">YOUTUBE / {video.fallback ? "LINK" : "VIDEO"}</span><strong>{video.title}</strong>{video.publishedAt && <small>{new Date(video.publishedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</small>}</span>
                  <span className="video-arrow"><ArrowIcon /></span>
                </ExternalLink>
              ))}
            </div>
          )}
          {videos && videos.videos.length === 0 && (
            <div className="video-empty">
              <span className="empty-index">A—01</span>
              <div>
                <p className="eyebrow">{videos.configured ? "ARCHIVE TEMPORARILY QUIET" : "ARCHIVE / UNCONFIGURED"}</p>
                <h3>{videos.error ?? (videos.configured ? "Nothing new has surfaced." : "The archive is waiting for a connection.")}</h3>
                <p>{videos.configured ? "Try the channel directly for recent uploads." : "Configure the YouTube Data API to show recent uploads here."}</p>
              </div>
              <ExternalLink href="https://www.youtube.com/@madtec" className="text-link">VISIT YOUTUBE <ArrowIcon /></ExternalLink>
            </div>
          )}
        </section>

        <section className="about-section section-shell" id="about">
          <div className="section-marker"><span>03</span><span>ABOUT / THE MAKER</span></div>
          <div className="about-content">
            <p className="eyebrow">A SMALL INTRODUCTION</p>
            <h2>Made in the open.<br />Sent <em>out into it.</em></h2>
            <div className="about-lower">
              <p className="about-copy">MadTec is an independent creator sharing live broadcasts and videos across Twitch and YouTube. This is the place to find the signal, catch up on what you missed, and see what’s next.</p>
              <div className="about-links">
                <ExternalLink href="https://www.twitch.tv/ohmtec" className="social-link">
                  <span className="social-icon social-icon--twitch"><TwitchIcon /></span><span><small>LIVE / STREAMS</small><strong>Twitch</strong></span><span className="social-arrow">↗</span>
                </ExternalLink>
                <ExternalLink href="https://www.youtube.com/@madtec" className="social-link">
                  <span className="social-icon social-icon--youtube"><YouTubeIcon /></span><span><small>VIDEOS / ARCHIVE</small><strong>YouTube</strong></span><span className="social-arrow">↗</span>
                </ExternalLink>
              </div>
            </div>
          </div>
          <div className="about-stamp" aria-hidden="true"><BrandMark /><span>INDEPENDENT<br />BROADCAST UNIT</span><span className="stamp-ring">MT—01 / OPEN LINE</span></div>
        </section>
      </main>

      <footer className="site-footer">
        <a href="#top" className="footer-brand" aria-label="Back to top"><BrandMark compact /></a>
        <span className="footer-note">MADE INDEPENDENTLY. TRANSMITTED EVERYWHERE.</span>
        <div className="footer-links">
          <ExternalLink href="https://www.twitch.tv/ohmtec">TWITCH ↗</ExternalLink>
          <ExternalLink href="https://www.youtube.com/@madtec">YOUTUBE ↗</ExternalLink>
        </div>
        <span className="copyright">© {new Date().getFullYear()} MADTEC</span>
        <a className="back-top" href="#top" aria-label="Back to top">↑</a>
      </footer>
    </>
  );
}
