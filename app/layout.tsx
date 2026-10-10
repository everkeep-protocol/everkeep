import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { NetworkStatusBanner } from "@/components/layout/network-status-banner";
import { CreatePlanDialog } from "@/components/wizard/create-plan-dialog";
import { Toaster } from "@/components/ui/toaster";
import { EverKeepAppProvider } from "@/providers/everkeep-app-provider";
import { SolanaProvider } from "@/providers/solana-provider";
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
  title: "EverKeep | Programmable Digital Continuity",
  description:
    "Decentralized digital asset inheritance on Solana. Non-custodial vaults with programmable continuity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <SolanaProvider>
          <EverKeepAppProvider>
            <div className="flex min-h-screen flex-col">
              <AppHeader />
              <NetworkStatusBanner />
              <main className="flex-1">{children}</main>
              <AppFooter />
            </div>
            <CreatePlanDialog />
            <Toaster />
          </EverKeepAppProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
