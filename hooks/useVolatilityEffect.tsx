import { useState, useEffect } from "react";
import { fetchVolatilityData } from "@/lib/volatilityOracle";

export const useVolatilityEffect = () => {
  const [volatility, setVolatility] = useState<number>(0);
  const [intensity, setIntensity] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchVolatilityData();

        if (!data) return;

        setVolatility(data.annualizedVolatility * 100); // Convert to percentage
        setLastPrice(data.lastPrice);
        setIntensity(0.5); // Default intensity for visual effect
        setError(null);
      } catch (err) {
        console.error("Error fetching volatility data:", err);
        setError("Failed to fetch volatility data");

        // Fallback to simulated data
        setVolatility(48.2);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, []);

  return { volatility, intensity, lastPrice, loading, error };
};
