import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

const geistSans = { variable: "font-sans" };
const geistMono = { variable: "font-mono" };

export const metadata: Metadata = {
  title: "Incident Radar",
  description:
    "AI-powered incident intelligence — transform noisy operational events into prioritized, explainable incidents.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="min-h-full bg-zinc-950 text-zinc-100">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
