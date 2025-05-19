"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  TrendingUp,
  Zap,
  AlertTriangle,
  Check,
  Calendar,
  Loader2,
} from "lucide-react";
import { formatDeposits } from "@/lib/marketUtils";
import MarketDetailsPopup from "@/components/MarketDetailsPopup";
import { useSuiVolatility } from "@/hooks/useSuiVolatility";
import { useSuiMarkets } from "@/hooks/useSuiMarkets";
import { Toaster } from "sonner";

// Market type definition for display
interface Market {
  id: string;
  name: string;
  symbol: string;
  tvl: string;
  tvlValue: number;
  protocol: string;
  protocolLogo?: string;
  category: string;
  strategy: string;
  hasBoost?: boolean;
  icons: string[];
  timestamp?: number;
  strike?: number;
  isExpired?: boolean;
  epoch?: string;
  address?: string;
  currentVol?: number; // Current realized volatility
  varLongMint?: string;
  varShortMint?: string;
  usdcVault?: string;
  startVolatility?: number;
  realizedVariance?: number;
  authority?: string;
  formattedStrike?: string;
}

const Markets = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  // Get live volatility data from the Sui hook
  const { annualizedVolatility: volatility, loading: volatilityLoading } =
    useSuiVolatility();

  // Get markets from Sui shared object
  const {
    markets: suiMarkets,
    loading: suiMarketsLoading,
    error: suiMarketsError,
  } = useSuiMarkets();

  // Calculate change percentage (mock data for now)
  const [changePercentage, setChangePercentage] = useState(2.4);
  const [isPositiveChange, setIsPositiveChange] = useState(true);

  useEffect(() => {
    // Calculate mock change percentage based on volatility
    // In a real app, you'd track previous values and calculate actual change
    if (!volatilityLoading && volatility) {
      const randomChange = (Math.random() * 5 - 2).toFixed(1);
      setChangePercentage(parseFloat(randomChange));
      setIsPositiveChange(parseFloat(randomChange) >= 0);
    }
  }, [volatility, volatilityLoading]);

  useEffect(() => {
    const formatSuiMarkets = () => {
      try {
        setIsLoading(true);

        if (suiMarketsLoading) {
          return; // Wait until loading is complete
        }

        if (suiMarketsError) {
          setError(suiMarketsError);
          return;
        }

        console.log("Processing Sui markets:", suiMarkets);

        // Convert market data to display format
        const formattedMarkets = suiMarkets.map((market) => {
          const strikeValue = market.strike * 100;

          return {
            id: market.id,
            name: `VOL-${strikeValue.toFixed(0)}`,
            symbol: `VOL-${strikeValue.toFixed(0)}`,
            tvl: formatDeposits(market.totalDeposits),
            tvlValue: market.totalDeposits,
            protocol: "Surge",
            category: "Variance Swap",
            strategy: "Variance Swap",
            icons: [market.isExpired ? "⚠️" : "🟢"],
            timestamp: market.timestamp,
            strike: market.strike,
            formattedStrike: `${market.strike.toFixed(2)}%`,
            isExpired: market.isExpired,
            epoch: market.epoch,
            address: market.id,
            currentVol: Math.sqrt(market.realizedVariance || 0), // Calculate current vol from realized variance
            varLongMint: market.varLongMint,
            varShortMint: market.varShortMint,
            usdcVault: market.usdcVault,
            startVolatility: market.startVolatility,
            realizedVariance: market.realizedVariance,
            authority: market.authority,
          };
        });

        setMarkets(formattedMarkets);
        setError(null);
      } catch (err) {
        console.error("Failed to process Sui markets:", err);
        setError("Failed to process market data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    formatSuiMarkets();
  }, [suiMarkets, suiMarketsLoading, suiMarketsError]);

  // Update tableData to include dynamically checked expiry status
  const tableData = markets.map((market) => {
    // Add dynamic expiry check based on epoch
    let dynamicExpired = market.isExpired || false;

    if (market.epoch && market.timestamp) {
      try {
        const epochNum = parseInt(market.epoch, 10);
        const expiryTimestamp = (market.timestamp + epochNum) * 1000; // Convert to milliseconds
        const currentTimestamp = Date.now();
        dynamicExpired = currentTimestamp > expiryTimestamp;
      } catch (err) {
        console.error(`Error checking expiry for market ${market.id}:`, err);
        // Fall back to the provided isExpired value
      }
    }

    return {
      id: market.id,
      asset: market.name,
      icons: market.icons,
      tvl: market.tvl,
      tvlValue: market.tvlValue,
      protocol: market.protocol,
      strategy: market.strategy,
      hasBoost: market.hasBoost || false,
      timestamp: market.timestamp,
      strike: market.strike,
      formattedStrike: market.formattedStrike,
      isExpired: dynamicExpired, // Use the dynamically calculated expiry status
      epoch: market.epoch,
      address: market.address,
      currentVol: market.currentVol,
      // Ensure we pass on the token addresses
      varLongMint: market.varLongMint,
      varShortMint: market.varShortMint,
      usdcVault: market.usdcVault,
      startVolatility: market.startVolatility,
      realizedVariance: market.realizedVariance,
      authority: market.authority,
    };
  });

  // Custom badge component to match the design
  const StrategyBadge = ({ strategy }: { strategy: string }) => {
    const getBgColor = () => {
      switch (strategy.toLowerCase()) {
        case "variance swap":
          return "bg-gradient-to-r from-[#019E8C]/20 to-[#019E8C]/10 text-[#019E8C] border-[#019E8C]/20";
        case "perpetual":
          return "bg-gradient-to-r from-[#B079B5]/20 to-[#B079B5]/10 text-[#B079B5] border-[#B079B5]/20";
        case "volatility index":
          return "bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-200";
        case "options":
          return "bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-orange-200";
        default:
          return "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200";
      }
    };

    return (
      <Badge
        variant="outline"
        className={`${getBgColor()} rounded-full font-medium border-0 px-3 py-1 shadow-sm`}
      >
        {strategy === "Variance Swap" && <Activity className="w-3 h-3 mr-1" />}
        {strategy === "Perpetual" && <TrendingUp className="w-3 h-3 mr-1" />}
        {strategy === "Volatility Index" && <Zap className="w-3 h-3 mr-1" />}
        {strategy}
      </Badge>
    );
  };

  // Status badge
  const StatusBadge = ({ isExpired }: { isExpired?: boolean }) => {
    if (isExpired === undefined) return null;

    return isExpired ? (
      <Badge className="bg-gradient-to-r from-red-100 to-red-50 text-red-600 border-0 px-3 py-1 rounded-full font-medium shadow-sm">
        <AlertTriangle className="w-3 h-3 mr-1" /> Expired
      </Badge>
    ) : (
      <Badge className="bg-gradient-to-r from-green-100 to-green-50 text-green-600 border-0 px-3 py-1 rounded-full font-medium shadow-sm">
        <Check className="w-3 h-3 mr-1" /> Active
      </Badge>
    );
  };

  // Format the expiry date from epoch
  const formatExpiry = (epoch?: string, timestamp?: number) => {
    if (!epoch || !timestamp) return "N/A";

    try {
      const epochNum = parseInt(epoch, 10);
      const expiryDate = new Date((timestamp + epochNum) * 1000);
      return expiryDate.toLocaleDateString();
    } catch (err) {
      console.error("Error formatting expiry:", err);
      return "Invalid date";
    }
  };

  // Handle row click to open market details
  const handleRowClick = (market: {
    id: string;
    asset: string;
    icons: string[];
    tvl: string;
    tvlValue: number;
    protocol: string;
    strategy: string;
    hasBoost: boolean;
    timestamp?: number;
    strike?: number;
    isExpired?: boolean;
    epoch?: string;
    address?: string;
    currentVol?: number;
    varLongMint?: string;
    varShortMint?: string;
    usdcVault?: string;
    startVolatility?: number;
    realizedVariance?: number;
    authority?: string;
    formattedStrike?: string;
  }) => {
    // Set selected market with all relevant details
    const selected: Market = {
      id: market.id,
      name: market.asset,
      symbol: market.asset,
      tvl: market.tvl,
      tvlValue: market.tvlValue,
      protocol: market.protocol,
      category: "Variance Swap",
      strategy: market.strategy,
      hasBoost: market.hasBoost,
      icons: market.icons,
      timestamp: market.timestamp,
      strike: market.strike,
      formattedStrike: market.formattedStrike,
      isExpired: market.isExpired,
      epoch: market.epoch,
      address: market.address || market.id,
      currentVol: market.currentVol,
      varLongMint: market.varLongMint,
      varShortMint: market.varShortMint,
      usdcVault: market.usdcVault,
      startVolatility: market.startVolatility,
      realizedVariance: market.realizedVariance,
      authority: market.authority,
    };

    setSelectedMarket(selected);
  };

  // Close the market details popup
  const closeMarketDetails = () => {
    setSelectedMarket(null);
  };

  // Loading indicator component
  const LoadingIndicator = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-[#019E8C] animate-spin mb-4" />
      <p className="text-gray-600">Loading markets from Sui...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-surge-deep-green overflow-hidden">
      <Header />
      <Toaster position="top-right" richColors />

      <main className="relative pt-6">
        {/* Background decorative elements */}
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

        <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
          <section className="mb-12">
            {/* Header section with left-aligned text and image on right */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-12 relative overflow-hidden">
              <div className="w-full md:w-1/2 text-left mb-8 md:mb-0">
                <h1 className="text-6xl md:text-7xl font-extrabold mb-4 leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#019E8C] to-[#344B47] relative">
                    Surge
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#B079B5] to-[#8A4A87]">
                      Swap
                    </span>
                    <span className="inline-block relative">
                      <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-[#019E8C] to-[#B079B5] rounded-full"></span>
                    </span>
                  </span>
                </h1>
                <p className="text-gray-700 text-xl max-w-2xl leading-relaxed relative ml-1 font-light">
                  <span className="bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent">
                    Trade volatility directly on Sui with precision instruments.
                    <span className="block mt-2 text-base text-gray-500 font-light">
                      Access the most advanced volatility markets on Sui
                    </span>
                  </span>
                </p>
              </div>

              <div className="w-full md:w-1/2 relative h-[300px]">
                <div className="absolute top-0 right-0 h-[300px] w-[400px] max-w-full">
                  <div className="relative h-full w-full flex items-center justify-end">
                    {/* Surge logo - circle with gradient */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-[180px] h-[180px] rounded-full bg-gradient-to-br from-[#019E8C] to-[#344B47] flex items-center justify-center z-10 shadow-xl animation-pulse-glow">
                      <div className="w-[150px] h-[150px] bg-white rounded-full flex items-center justify-center">
                        <div className="text-[#019E8C] text-6xl font-extrabold">
                          S
                        </div>
                      </div>
                    </div>

                    {/* Surge coin */}
                    <div className="absolute right-40 top-10 w-[150px] h-[150px] rounded-full bg-gradient-to-br from-[#B079B5] to-[#8A4A87] border-4 border-white shadow-xl flex items-center justify-center transform rotate-12 animate-float">
                      <div className="w-[130px] h-[130px] bg-white rounded-full flex items-center justify-center">
                        <span className="text-[#B079B5] text-4xl font-bold">
                          $
                        </span>
                      </div>
                    </div>

                    {/* Volatility Display */}
                    <div className="absolute right-64 bottom-16 w-[180px] h-[180px] rounded-full bg-white border-2 border-[#019E8C]/10 shadow-md flex flex-col items-center justify-center z-20">
                      {/* Content */}
                      <span className="text-gray-500 text-sm font-medium mb-0.5">
                        SOL Volatility
                      </span>
                      {volatilityLoading ? (
                        <div className="text-[#019E8C] text-6xl font-bold leading-none tracking-tight mb-1 opacity-50">
                          ...
                        </div>
                      ) : (
                        <div className="text-[#019E8C] text-6xl font-bold leading-none tracking-tight mb-1">
                          {volatility ? volatility.toFixed(2) : "36.24"}
                          <span className="text-4xl">%</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        {isPositiveChange ? (
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-red-500 mr-1 transform rotate-180" />
                        )}
                        <span
                          className={
                            isPositiveChange
                              ? "text-green-500 text-sm font-medium"
                              : "text-red-500 text-sm font-medium"
                          }
                        >
                          {isPositiveChange ? "+" : ""}
                          {changePercentage}%
                        </span>
                      </div>
                    </div>

                    {/* Background effect */}
                    <div className="absolute inset-0 flex items-center justify-center text-[#111]/5 text-9xl font-bold z-[-1] animate-pulse-subtle">
                      SURGE
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Section - Main Content */}
            <div className="bg-gradient-to-br from-white to-[#019E8C]/5 rounded-2xl shadow-lg overflow-hidden mb-12 border border-[#019E8C]/10">
              <div className="border-b border-[#019E8C]/10 px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between bg-gradient-to-r from-[#f5f5dc]/80 to-white gap-4">
                <div>
                  <h3 className="text-2xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-[#344B47] to-[#019E8C]">
                    Volatility Variance Markets
                  </h3>
                  <p className="text-gray-600 font-light">
                    Trade volatility derivatives with strike-based variance
                    swaps on{" "}
                    <span className="text-[#019E8C] font-medium">Surge</span>
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-4 border-[#019E8C] text-[#019E8C] hover:bg-[#019E8C]/5 gap-2 shadow-sm"
                    >
                      <Calendar className="h-4 w-4" /> Sort by Expiry
                    </Button>
                  </div>
                </div>
              </div>

              {/* Display loading state or error when appropriate */}
              {isLoading && <LoadingIndicator />}

              {error && (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-4" />
                  <p className="text-gray-700 mb-2 font-medium">
                    Error Loading Markets
                  </p>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    {error}
                  </p>
                </div>
              )}

              {!isLoading && !error && markets.length === 0 && (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-8 h-8 text-orange-500 mx-auto mb-4" />
                  <p className="text-gray-700 mb-2 font-medium">
                    No Markets Found
                  </p>
                  <p className="text-gray-600 text-sm max-w-md mx-auto">
                    Could not find any markets for the current package. Please
                    check the package ID.
                  </p>
                </div>
              )}

              {!isLoading && !error && markets.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-0 bg-gradient-to-r from-[#019E8C]/10 to-[#019E8C]/5">
                        <TableHead className="py-4 text-xs uppercase tracking-wider font-semibold text-[#344B47]">
                          Market
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-semibold text-[#344B47]">
                          Protocol
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-semibold text-[#344B47]">
                          Type
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-semibold text-[#344B47]">
                          Strike
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-semibold text-[#344B47]">
                          Expiry
                        </TableHead>
                        <TableHead className="text-xs uppercase tracking-wider font-semibold text-[#344B47]">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.map((row, index) => (
                        <TableRow
                          key={row.id}
                          className={`h-16 transition-all cursor-pointer border-b border-gray-100 last:border-0 ${
                            index % 2 === 0 ? "bg-white" : "bg-[#f5f5dc]/30"
                          } hover:bg-gradient-to-r hover:from-[#019E8C]/5 hover:to-[#019E8C]/10`}
                          onClick={() => handleRowClick(row)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex p-2 rounded-full bg-gray-100">
                                {row.icons.map((icon, idx) => (
                                  <span key={idx} className="text-2xl">
                                    {icon}
                                  </span>
                                ))}
                              </div>
                              <span className="font-semibold text-[#344B47]">
                                {row.asset}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-4 h-4 bg-[#019E8C] rounded-full shadow-sm"></span>
                              <span className="font-medium text-[#344B47]">
                                {row.protocol}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StrategyBadge strategy={row.strategy} />
                          </TableCell>
                          <TableCell className="font-medium text-[#344B47]">
                            {row.formattedStrike}
                          </TableCell>
                          <TableCell className="text-[#344B47]">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {formatExpiry(row.epoch, row.timestamp)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge isExpired={row.isExpired} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Market Details Popup */}
      {selectedMarket && (
        <MarketDetailsPopup
          id={selectedMarket.id}
          name={selectedMarket.name}
          address={selectedMarket.address || ""}
          symbol={selectedMarket.symbol}
          protocol={selectedMarket.protocol}
          strategy={selectedMarket.strategy}
          strike={selectedMarket.strike}
          epoch={selectedMarket.epoch}
          timestamp={selectedMarket.timestamp}
          isExpired={selectedMarket.isExpired}
          isOpen={!!selectedMarket}
          onClose={closeMarketDetails}
          varLongMint={selectedMarket.varLongMint}
          varShortMint={selectedMarket.varShortMint}
          usdcVault={selectedMarket.usdcVault}
          currentVol={selectedMarket.currentVol}
          startVolatility={selectedMarket.startVolatility}
          realizedVariance={selectedMarket.realizedVariance}
          authority={selectedMarket.authority}
        />
      )}
    </div>
  );
};

export default Markets;
