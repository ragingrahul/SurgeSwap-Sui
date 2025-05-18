"use client";
import { useState, useEffect } from "react";
import { useVolatilityEffect } from "@/hooks/useVolatilityEffect";

const VolatilityDisplay = ({ value }: { value: string }) => {
  const [visible, setVisible] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    // When value changes, trigger the fade effect
    if (value !== prevValue && value !== "Loading...") {
      setVisible(false);
      const timer = setTimeout(() => {
        setPrevValue(value);
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    } else if (!visible && value !== "Loading...") {
      // Initial fade-in
      const timer = setTimeout(() => {
        setVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue, visible]);

  return (
    <span
      className={`text-white font-bold text-lg transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {prevValue}
    </span>
  );
};

const CryptoCard = ({
  name,
  symbol,
  price,
  change,
  color,
  delay,
  isVolatility = false,
}: {
  name: string;
  symbol: string;
  price: string;
  change?: string;
  color: string;
  delay: number;
  isVolatility?: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`relative rounded-xl py-3 px-4 w-full ${color} shadow-lg transition-all duration-700 ease-out ${
        isVisible ? "opacity-100" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
          {symbol === "ETH" ? (
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          ) : symbol === "SOL" ? (
            <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
          ) : (
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          )}
        </div>
        <span className="text-white text-sm font-medium">{name}</span>
        <span className="text-white/60 text-xs ml-auto">{symbol}</span>
      </div>
      <div className="flex items-end justify-between">
        {isVolatility ? (
          <VolatilityDisplay value={price} />
        ) : (
          <span className="text-white font-bold text-lg">{price}</span>
        )}
        <div className="flex items-center gap-1">
          <span
            className={`text-xs ${
              change?.startsWith("+") ? "text-green-400" : "text-red-400"
            }`}
          >
            {change}
          </span>
        </div>
      </div>
    </div>
  );
};

const PhoneMockup = () => {
  const [loaded, setLoaded] = useState(false);
  const { volatility, lastPrice, loading } = useVolatilityEffect();

  useEffect(() => {
    setLoaded(true);
  }, []);

  const formattedVolatility = loading
    ? "Loading..."
    : `${volatility.toFixed(2)}%`;

  const formattedSolPrice = loading ? "Loading..." : `$${lastPrice.toFixed(2)}`;

  return (
    <div className="relative h-[480px]">
      <div
        className={`absolute left-1/2 transform -translate-x-1/2 w-64 h-[480px] bg-black rounded-[36px] border-[6px] border-gray-800 overflow-hidden shadow-2xl animate-float transition-all duration-1000 ease-out ${
          loaded ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="absolute top-0 left-0 w-full h-6 bg-black flex justify-center">
          <div className="w-20 h-4 bg-black rounded-b-xl"></div>
        </div>
        <div className="w-full h-full bg-gradient-to-b from-surge-teal/20 to-surge-purple/20 overflow-y-auto">
          <div className="pt-2 px-4 flex justify-between items-center text-[10px] text-white">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-white"></div>
              <div className="h-2 w-2 rounded-full bg-white"></div>
              <div className="h-2 w-2 rounded-full bg-white"></div>
            </div>
          </div>

          <div className="mt-4 px-3 space-y-3">
            <CryptoCard
              name="Volatility Index"
              symbol="Vol"
              price={formattedVolatility}
              color="bg-[#019E8C]/80"
              delay={200}
              isVolatility={true}
            />
            <CryptoCard
              name="Solana"
              symbol="SOL"
              price={formattedSolPrice}
              color="bg-[#B079B5]/80"
              delay={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneMockup;
