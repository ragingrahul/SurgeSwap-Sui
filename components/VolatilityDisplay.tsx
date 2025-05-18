"use client";

import React, { useState, useEffect } from "react";
import { useVolatilityEffect } from "@/hooks/useVolatilityEffect";

const VolatilityDisplay = () => {
  const { volatility, loading } = useVolatilityEffect();
  const [visible, setVisible] = useState(false);
  const [prevValue, setPrevValue] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && volatility !== prevValue) {
      // When value changes or loads initially, trigger the fade effect
      setVisible(false);
      const timer = setTimeout(() => {
        setPrevValue(volatility);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [volatility, prevValue, loading]);

  // Calculate placeholder value to ensure consistent layout dimensions
  const displayValue = prevValue
    ? prevValue.toFixed(2)
    : volatility
    ? volatility.toFixed(2)
    : "48.20";

  return (
    // Fixed height container to prevent layout shifts
    <div className="mb-2" style={{ minHeight: "350px" }}>
      <div className="text-5xl font-bold mb-2">
        Bet on Chaos. <br />
        Hedge Against Calm.
      </div>

      {/* Fixed height container for the volatility display */}
      <div className="backdrop-blur-sm p-8" style={{ minHeight: "180px" }}>
        {loading ? (
          <div className="h-20 w-full flex items-center justify-center">
            <div className="w-32 h-12 bg-surge-teal/10 rounded-lg animate-pulse"></div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex flex-col items-center">
              <div className="text-sm font-semibold tracking-wider text-[#003025] mb-2">
                SOLANA VOLATILITY INDEX
              </div>
              {/* Fixed height container for the value */}
              <div
                className="relative"
                style={{
                  height: "120px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  className="text-8xl font-bold relative"
                  style={{
                    position: "relative",
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    className={`text-[#019e8c] transition-opacity duration-500 ${
                      visible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {displayValue}%
                  </span>
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-[#019e8c]/10 to-[#0AEFFF]/10 blur-lg opacity-50 -z-10 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolatilityDisplay;
