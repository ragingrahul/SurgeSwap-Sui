import { useState, useEffect } from "react";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

// Object ID for the VolatilityStats
const VOLATILITY_OBJECT_ID =
  "0xf125bb79db636472eb777e05900f9aaeb30fad54bb85bdc71253f52deed39c2d";

// Only use testnet
const NETWORK = "testnet";

export interface SuiVolatilityData {
  annualizedVolatility: number;
  lastPrice: number;
  mean: number;
  m2: number;
  count: number;
  loading: boolean;
  error: string | null;
  network: string;
}

interface VolatilityStatsFields {
  ann_vol_fp: string;
  authority: string;
  count: string;
  last_price_u6: string;
  m2_fp: string;
  mean_fp: string;
  id: Record<string, unknown>;
  [key: string]: unknown;
}

interface ObjectContent {
  fields?: VolatilityStatsFields;
  type?: string;
  [key: string]: unknown;
}

export const useSuiVolatility = (): SuiVolatilityData => {
  const [annualizedVolatility, setAnnualizedVolatility] = useState<number>(0);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const [mean, setMean] = useState<number>(0);
  const [m2, setM2] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [network] = useState<string>(NETWORK);

  useEffect(() => {
    const fetchVolatilityData = async () => {
      try {
        setLoading(true);
        console.log(
          "Fetching volatility data from Sui testnet, object:",
          VOLATILITY_OBJECT_ID
        );

        // Create a direct client for testnet
        const testnetClient = new SuiClient({ url: getFullnodeUrl("testnet") });

        // Fetch the object data from Sui testnet
        const response = await testnetClient.getObject({
          id: VOLATILITY_OBJECT_ID,
          options: {
            showContent: true,
          },
        });

        console.log("Sui object response:", response);

        if (!response.data) {
          console.error("No data in response", response);
          throw new Error("No data returned from Sui testnet");
        }

        if (!response.data.content) {
          console.error("No content in data", response.data);
          throw new Error("Object exists but has no content");
        }

        // Parse the volatility value from the object
        const content = response.data.content as ObjectContent;
        console.log("Content:", content);

        if (!content.fields) {
          console.error("No fields in content", content);
          throw new Error("Object content missing fields");
        }

        const fields = content.fields;
        console.log("Fields:", fields);

        // Using nullish coalescing to handle missing fields more gracefully
        const annVolFp = parseInt(fields.ann_vol_fp ?? "0");
        const lastPriceU6 = parseInt(fields.last_price_u6 ?? "0");
        const meanFp = parseInt(fields.mean_fp ?? "0");
        const m2Fp = parseInt(fields.m2_fp ?? "0");
        const countValue = parseInt(fields.count ?? "0");

        console.log("Parsed values:", {
          annVolFp,
          lastPriceU6,
          meanFp,
          m2Fp,
          countValue,
        });

        // Convert values to appropriate units
        const annualizedVol = annVolFp / 1000;
        const lastPriceValue = lastPriceU6 / 100000000;
        const meanValue = meanFp / 10000;
        const m2Value = m2Fp / 10000;

        console.log("Converted values:", {
          annualizedVol,
          lastPriceValue,
          meanValue,
          m2Value,
        });

        // Update state with parsed values
        setAnnualizedVolatility(annualizedVol);
        setLastPrice(lastPriceValue);
        setMean(meanValue);
        setM2(m2Value);
        setCount(countValue);
        setError(null);
      } catch (err) {
        console.error("Error fetching Sui volatility data from testnet:", err);

        // Provide more detailed error information
        if (err instanceof Error) {
          setError(
            `Failed to fetch volatility data from testnet: ${err.message}`
          );
        } else {
          setError(
            "Failed to fetch volatility data from testnet: Unknown error"
          );
        }

        // Set default values for better UX
        setAnnualizedVolatility(0);
        setLastPrice(0);
        setMean(0);
        setM2(0);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchVolatilityData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchVolatilityData, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    annualizedVolatility,
    lastPrice,
    mean,
    m2,
    count,
    loading,
    error,
    network,
  };
};
