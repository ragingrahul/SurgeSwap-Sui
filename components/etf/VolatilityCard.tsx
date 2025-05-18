import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useVolatilityEffect } from "@/hooks/useVolatilityEffect";

const VolatilityCard = () => {
  const { volatility, loading, error } = useVolatilityEffect();

  // Calculate 24h change (mock data for demo purposes)
  // In a real app, you'd track previous values or get from API
  const changePercentage = 2.3;
  const isPositiveChange = true;

  return (
    <Card className="bg-[#F5EFE0] border border-[#D9C9A8]/50 shadow-md rounded-xl text-surge-deep-green p-6 overflow-hidden relative">
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
          {loading ? (
            <div className="h-8 w-20 bg-surge-teal/10 rounded-lg animate-pulse"></div>
          ) : (
            <div className="flex items-center">
              <p className="text-2xl text-surge-deep-green font-semibold mr-2">
                {volatility ? volatility.toFixed(1) : "0.0"}%
              </p>
              <span
                className={`flex items-center text-sm ${
                  isPositiveChange ? "text-[#019E8C]" : "text-red-500"
                }`}
              >
                {isPositiveChange ? "+" : "-"}
                {Math.abs(changePercentage).toFixed(1)}%
                {isPositiveChange ? (
                  <ArrowUpRight className="ml-1" size={14} />
                ) : (
                  <ArrowDownRight className="ml-1" size={14} />
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2">
          Error fetching volatility data. Using fallback values.
        </p>
      )}
    </Card>
  );
};

export default VolatilityCard;
