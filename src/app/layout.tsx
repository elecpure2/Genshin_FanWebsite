import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { GlobalCanvas } from "@/components/canvas/GlobalCanvas";
import { GlobalTransitionOverlay } from "@/components/ui/GlobalTransitionOverlay";
import { GlobalTransition } from "@/components/ui/GlobalTransition";
import { GlobalAudio } from "@/components/ui/GlobalAudio";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Genshin Impact FanWeb",
  description: "AAA Fan Website for Genshin Impact Characters",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} antialiased font-sans`}
      >
        <GlobalAudio />
        <GlobalTransitionOverlay />
        <GlobalTransition />
        <GlobalCanvas />
        <main className="relative z-10 w-full h-full">{children}</main>
      </body>
    </html>
  );
}
