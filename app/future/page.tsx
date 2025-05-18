"use client";

import ActivePositionPanel from "@/components/etf/ActivePositionPanel";
import TradePanel from "@/components/etf/TradePanel";
import VolatilityCard from "@/components/etf/VolatilityCard";
import Header from "@/components/Header";
import React from "react";
import { Toaster } from "sonner";

function page() {
  return (
    <div className="min-h-screen bg-[#F8F5EE] text-surge-deep-green">
      <Header />
      <Toaster position="top-right" richColors />
      <div className="container max-w-screen-xl mx-auto py-24 px-4 md:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 -bottom-8 text-[30vw] font-bold text-[#019e8c]/10 text-center whitespace-nowrap leading-none">
            Surge
          </div>
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#019e8c]/10 to-transparent blur-3xl"></div>
          <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#B079B5]/10 to-transparent blur-3xl"></div>
          <div className="absolute bottom-20 right-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-[#019e8c]/5 to-transparent blur-3xl"></div>

          {/* Cool mesh gradients */}
          <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-r from-[#019e8c]/10 to-[#B079B5]/5 mix-blend-multiply blur-3xl opacity-50"></div>
          <div className="absolute bottom-1/3 right-1/4 w-[250px] h-[250px] rounded-full bg-gradient-to-r from-[#B079B5]/10 to-[#019e8c]/5 mix-blend-multiply blur-3xl opacity-50"></div>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          <VolatilityCard />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TradePanel />
            <ActivePositionPanel />
          </div>

          <div className="flex items-center gap-2 text-lg font-bold text-surge-deep-green pl-1 mt-8 mb-3"></div>
        </div>
      </div>
    </div>
  );
}

export default page;
