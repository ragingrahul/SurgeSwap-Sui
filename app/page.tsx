"use client";

import Header from "@/components/Header";
import PhoneMockup from "@/components/PhoneMockup";
import { Button } from "@/components/ui/button";
import { TrendingUp, Activity } from "lucide-react";
import VolatilityDisplay from "@/components/VolatilityDisplay";
import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-surge-beige">
      <Header />
      <main className="h-[calc(110vh-4rem)] overflow-hidden">
        {/* Hero Section */}
        <section className="relative h-full">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute left-0 right-0 -bottom-8 tom-0 text-[30vw] font-bold text-[#019e8c]/30 text-center whitespace-nowrap leading-none">
              Surgify
            </div>
          </div>

          <div className="container mx-auto px-4 relative z-10 h-full">
            <div className="flex flex-col items-center justify-start max-w-3xl mx-auto text-center pt-24 md:pt-32 lg:pt-40">
              <VolatilityDisplay />

              <p className="text-base md:text-lg font-semibold text-gray-700 max-w-2xl mx-auto mb-6 md:mb-8 ">
                Trade volatility directly on Solana with precision instruments.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6 md:mb-8">
                <Link href="/market">
                  <Button className="bg-[#019E8C] hover:bg-[#344B47] text-white rounded-full px-6 py-5 text-base flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Variance Swap
                  </Button>
                </Link>
                <Link href="/etf">
                  <Button className="rounded-full px-6 py-5 text-base text-white flex items-center gap-2 bg-[#B079B5] hover:bg-[#7B4780]">
                    <TrendingUp className="w-5 h-5" />
                    Volatility ETF
                  </Button>
                </Link>
              </div>

              <div className="relative w-full max-w-md mx-auto">
                <PhoneMockup />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Simple component to display volatility data
