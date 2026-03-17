import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
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
  title: "LexiClear | AI Legal Simplifier",
  description: "Simplify complex legal text and identify potential risks instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex bg-slate-50 dark:bg-slate-950 min-h-screen`}
      >
        <AuthProvider>
           <Sidebar />
           <div className="flex-1 w-full h-screen min-w-0 flex flex-col relative overflow-hidden">
              {children}
           </div>
        </AuthProvider>
      </body>
    </html>
  );
}
