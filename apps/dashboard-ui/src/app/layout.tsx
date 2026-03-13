import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Micro-Security Gateway - Self-Hosted AI API Gateway",
  description: "Your AI gateway. Your infrastructure. Your control. Self-hosted, open-source gateway with enterprise security features like anomaly detection, PII scrubbing, and hard spending caps.",
  keywords: ["AI gateway", "API gateway", "OpenAI proxy", "Anthropic proxy", "self-hosted", "open source"],
  authors: [{ name: "Micro-Security Gateway" }],
  openGraph: {
    title: "Micro-Security Gateway - Self-Hosted AI API Gateway",
    description: "Deploy on your own infrastructure. Keep your API keys private.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
