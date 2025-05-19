import { useState, useEffect } from "react";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";

// Updated package ID
const PACKAGE_ID =
  "0xaf4b4cc5cbcd40d5e8c6ae8c2695dd58d23dedfd4949e1903765559be853119c";

const NETWORK = "testnet"; // Adjust this based on where your object is deployed (testnet/mainnet/devnet)

export interface SuiMarket {
  id: string;
  name: string;
  strike: number;
  epoch: string;
  timestamp: number;
  isExpired: boolean;
  varLongMint: string;
  varShortMint: string;
  usdcVault: string;
  totalDeposits: number;
  currentVol?: number;
  authority?: string;
  startVolatility?: number;
  realizedVariance?: number;
}

export interface SuiMarketsData {
  markets: SuiMarket[];
  loading: boolean;
  error: string | null;
  network: string;
}

// Market interface from fetchAllMarkets
interface Market {
  id: string;
  epoch: number;
  strike: number;
  timestamp: number;
  timeRemaining: number;
  isExpired: boolean;
  startVolatility: number;
  realizedVariance: number;
  totalDeposits: number;
  coinType: string;
}

// Interface for market fields from Sui object
interface MarketFields {
  epoch: string;
  strike: string;
  timestamp: string;
  start_volatility: string;
  realized_variance: string;
  total_deposits: string;
  [key: string]: unknown;
}

export const useSuiMarkets = (): SuiMarketsData => {
  const [markets, setMarkets] = useState<SuiMarket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [network] = useState<string>(NETWORK);

  useEffect(() => {
    const fetchMarketsData = async () => {
      try {
        setLoading(true);
        console.log("Fetching markets data from Sui network events");

        // Create a client for the appropriate network
        const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) });

        // Use the new fetchAllMarkets function to get markets
        const marketDetails = await fetchAllMarkets(suiClient);
        console.log("Fetched markets:", marketDetails);

        // Process each market to our format
        const formattedMarkets: SuiMarket[] = marketDetails.map((market) => ({
          id: market.id,
          name: `SUI-${(market.strike * 100).toFixed(0)}`, // Format name based on strike
          strike: market.strike,
          epoch: market.epoch.toString(),
          timestamp: market.timestamp,
          isExpired: market.isExpired,
          varLongMint: "", // These would need to be populated from object if available
          varShortMint: "",
          usdcVault: "",
          totalDeposits: market.totalDeposits,
          startVolatility: market.startVolatility,
          realizedVariance: market.realizedVariance,
          authority: "",
        }));

        console.log("Formatted markets:", formattedMarkets);
        setMarkets(formattedMarkets);
        setError(null);
      } catch (err) {
        console.error("Error fetching Sui markets data:", err);

        // Provide more detailed error information
        if (err instanceof Error) {
          setError(`Failed to fetch markets data: ${err.message}`);
        } else {
          setError("Failed to fetch markets data: Unknown error");
        }

        // Set empty markets array for better error handling
        setMarkets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketsData();
  }, []);

  // Implementation of fetchAllMarkets function
  async function fetchAllMarkets(client: SuiClient): Promise<Market[]> {
    try {
      console.log("Fetching all markets using MarketInitialized events");
      // Search for all MarketInitialized events
      const { data: events } = await client.queryEvents({
        query: {
          MoveEventType: `${PACKAGE_ID}::variance_swap::MarketInitialized`,
        },
        limit: 50,
      });

      console.log(`Found ${events.length} market events`);

      // Extract market IDs from events
      const marketIds = events
        .map((event) => {
          if (event.parsedJson && typeof event.parsedJson === "object") {
            const parsedEvent = event.parsedJson as Record<string, string>;
            return parsedEvent.market_id || null;
          }
          return null;
        })
        .filter((id): id is string => id !== null);

      console.log("Market IDs:", marketIds);

      // Fetch detailed data for each market
      const marketsData = await Promise.all(
        marketIds.map(async (id) => {
          try {
            const { data } = await client.getObject({
              id,
              options: { showContent: true, showType: true },
            });

            if (
              !data?.content ||
              typeof data.content !== "object" ||
              !("fields" in data.content)
            ) {
              console.log(`No content fields for market ${id}`);
              return null;
            }

            const fields = data.content.fields as MarketFields;
            const typeStr = data.type || "";
            const coinType = typeStr.split("<")[1]?.split(">")[0] || "";
            const currentTime = Math.floor(Date.now() / 1000);

            // Calculate time remaining
            const expiryTime = Number(fields.timestamp) + Number(fields.epoch);
            const timeRemaining = Math.max(0, expiryTime - currentTime);
            const isExpired = currentTime > expiryTime;

            return {
              id: id,
              epoch: Number(fields.epoch),
              strike: Number(fields.strike) / 1000, // Convert from basis points if needed
              timestamp: Number(fields.timestamp),
              timeRemaining,
              isExpired,
              startVolatility: Number(fields.start_volatility) / 100,
              realizedVariance: Number(fields.realized_variance) / 100,
              totalDeposits: Number(fields.total_deposits),
              coinType,
            };
          } catch (error) {
            console.error(`Error fetching market ${id}:`, error);
            return null;
          }
        })
      );

      // Filter out nulls and return valid markets
      return marketsData.filter((market): market is Market => market !== null);
    } catch (error) {
      console.error("Error in fetchAllMarkets:", error);
      throw error;
    }
  }

  return { markets, loading, error, network };
};
