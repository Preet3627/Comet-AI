"use client";

import { useAppStore } from '@/store/useAppStore';
import type { Metadata } from "next";
import "./globals.css";

import TitleBar from "@/components/TitleBar";


// Metadata cannot be exported from a client component directly.
// If critical, define it in a separate `metadata.ts` file or a parent server component.
// export const metadata: Metadata = {
//   title: "Comet Browser",
//   description: "An AI-integrated browser application",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const store = useAppStore();
  const isLandingPage = store.activeView === 'landing-page';

  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased bg-deep-space-bg ${isLandingPage ? 'overflow-auto' : 'overflow-hidden'} h-screen`}>
        {children}
      </body>
    </html>
  );
}
