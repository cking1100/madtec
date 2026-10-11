import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "MadTec — Independent creator, online whenever",
  description:
    "The independent home of MadTec. Find the live broadcast, new uploads, and links to Twitch and YouTube.",
  openGraph: {
    title: "MadTec — Independent creator, online whenever",
    description:
      "The independent home of MadTec. Find the live broadcast, new uploads, and links to Twitch and YouTube.",
    url: siteUrl,
    siteName: "MadTec",
    type: "website",
    images: [{ url: "/opengraph-image" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MadTec — Independent creator, online whenever",
    description: "Independent creator. Online whenever.",
    images: ["/opengraph-image"],
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
