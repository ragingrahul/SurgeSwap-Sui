import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import WalletWrapper from "@/providers/SolanaWalletProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Surge Protocol - Trade Volatility",
  description: "Surge Protocol: Trade volatility on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surge-beige text-[#344B47]`}
      >
        <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(1,158,140,0.07),transparent_70%)] pointer-events-none z-0"></div>
        <WalletWrapper>{children}</WalletWrapper>
      </body>
    </html>
  );
}
