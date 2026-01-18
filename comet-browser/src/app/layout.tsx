import type { Metadata } from "next";
import "./globals.css";

import TitleBar from "@/components/TitleBar";


export const metadata: Metadata = {
  title: "Comet Browser",
  description: "An AI-integrated browser application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-deep-space-bg pt-10 overflow-hidden h-screen">
        <TitleBar />
        {children}
      </body>
    </html>
  );
}
