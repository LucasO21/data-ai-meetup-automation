import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "../components/ToasterProvider";
import { AuthProvider } from "../components/AuthProvider";
import { NavBar } from "../components/NavBar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DC Meetup Automation",
  description: "AI-powered DC tech meetup tracker with Telegram bot, auto-scraping, and Google Calendar integration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <AuthProvider>
          <NavBar />
          <ToasterProvider />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
