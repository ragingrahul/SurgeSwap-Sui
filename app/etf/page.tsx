"use client";

import React from "react";
import Header from "@/components/Header";
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
          <div className="bg-[#F5EFE0] border border-[#D9C9A8]/50 shadow-md rounded-xl text-surge-deep-green p-6 overflow-hidden relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-surge-deep-green">
                  Volatility ETF
                </h2>
              </div>
              <span className="text-lg text-surge-deep-purple mt-2 md:mt-0 font-medium">
                VOL/USDC
              </span>
            </div>

            <hr className="border-[#D9C9A8]/50 mb-5" />

            <div className="grid grid-cols-1 gap-5 mb-6 relative z-10">
              <div className="p-3 rounded-lg bg-white/70 border border-[#D9C9A8]/50">
                <p className="text-surge-deep-green font-medium mb-1 text-sm">
                  Realized Volatility
                </p>
                <div className="flex items-center">
                  <p className="text-2xl text-surge-deep-green font-semibold mr-2">
                    48.2%
                  </p>
                  <span className="flex items-center text-sm text-[#019E8C]">
                    +2.3%
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="ml-1"
                    >
                      <path d="m7 7 5-5 5 5" />
                      <path d="M7 17h10" />
                      <path d="m17 7-5-5" />
                      <path d="M7 7h10" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Trade Panel */}
            <div className="bg-[#F5EFE0] border border-[#D9C9A8]/50 shadow-md rounded-xl p-5">
              <h3 className="text-xl font-bold mb-4">Trade Volatility</h3>
              <div className="space-y-4">
                <div className="p-3 bg-white/70 rounded-lg border border-[#D9C9A8]/50">
                  <label className="block text-sm font-medium mb-1">
                    Amount
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 bg-white border border-[#D9C9A8] rounded"
                    placeholder="0.00"
                    disabled
                  />
                </div>
                <div className="p-3 bg-white/70 rounded-lg border border-[#D9C9A8]/50">
                  <label className="block text-sm font-medium mb-1">
                    Direction
                  </label>
                  <div className="flex rounded-md overflow-hidden border border-[#D9C9A8]">
                    <button className="flex-1 py-2 bg-[#019e8c] text-white font-medium">
                      Long
                    </button>
                    <button className="flex-1 py-2 bg-white text-surge-deep-green font-medium">
                      Short
                    </button>
                  </div>
                </div>
                <button className="w-full py-3 bg-[#019e8c] text-white rounded-lg font-bold shadow-sm hover:bg-[#019e8c]/90 transition-colors cursor-not-allowed opacity-50">
                  Connect Wallet
                </button>
              </div>
            </div>

            {/* Active Position Panel */}
            <div className="bg-[#F5EFE0] border border-[#D9C9A8]/50 shadow-md rounded-xl p-5">
              <h3 className="text-xl font-bold mb-4">Your Position</h3>
              <div className="flex flex-col items-center justify-center h-40 p-5 bg-white/70 rounded-lg border border-[#D9C9A8]/50">
                <p className="text-lg text-gray-500">No active position</p>
                <p className="text-sm text-gray-400 mt-2">
                  Connect wallet to view your positions
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-lg font-bold text-surge-deep-green pl-1 mt-8 mb-3"></div>
        </div>
      </div>
    </div>
  );
}

export default page;
