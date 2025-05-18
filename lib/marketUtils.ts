import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import type { SurgeVariance } from "../idl/surge_variance";
import idl from "../idl/surge_variance.json";

// Define the market data interface
export interface MarketData {
  id: string;
  address: string;
  epoch: string;
  strike: number;
  realizedVariance: number;
  varLongMint: string;
  varShortMint: string;
  usdcVault: string;
  authority: string;
  volatilityStats: string;
  timestamp: number;
  startVolatility: number;
  isInitialized: boolean;
  isExpired: boolean;
  totalDeposits: number;
  currentVol?: number; // Current realized volatility
}

// Create a simple wallet adapter
function makeWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTransaction: async (tx: any) => tx,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signAllTransactions: async (txs: any[]) => txs,
  };
}

// Fetch all markets from the surge_variance program
export async function fetchAllMarkets(): Promise<MarketData[]> {
  try {
    const wallet = Keypair.generate();
    const connection = new Connection(clusterApiUrl("devnet"));
    const newWallet = makeWallet(wallet);
    const provider = new AnchorProvider(connection, newWallet, {
      commitment: "processed",
    });
    anchor.setProvider(provider);

    const program = new Program<SurgeVariance>(idl as SurgeVariance, provider);

    // Fetch all market accounts
    const marketAccounts = await program.account.market.all();

    // Convert program accounts to MarketData format
    return marketAccounts.map((account) => {
      const data = account.account;
      console.log("Market data:", {
        pubkey: account.publicKey.toBase58(),
        epoch: data.epoch.toString(),
        strike: data.strike,
        timestamp: data.timestamp.toNumber(),
        isExpired: data.isExpired,
      });

      return {
        id: account.publicKey.toBase58().slice(0, 8), // shortened ID for display
        address: account.publicKey.toBase58(),
        epoch: data.epoch.toString(),
        strike: data.strike,
        realizedVariance: data.realizedVariance,
        varLongMint: data.varLongMint.toBase58(),
        varShortMint: data.varShortMint.toBase58(),
        usdcVault: data.usdcVault.toBase58(),
        authority: data.authority.toBase58(),
        volatilityStats: data.volatilityStats.toBase58(),
        timestamp: data.timestamp.toNumber(),
        startVolatility: data.startVolatility,
        isInitialized: data.isInitialized,
        isExpired: data.isExpired,
        totalDeposits: data.totalDeposits.toNumber(),
        currentVol: Math.sqrt(data.realizedVariance), // Calculate volatility as sqrt of variance
      };
    });
  } catch (error) {
    console.error("Error fetching market data:", error);
    return [];
  }
}

// Convert timestamp to human-readable date
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString();
}

// Format deposits with appropriate units (K, M, B)
export function formatDeposits(deposits: number): string {
  if (deposits >= 1_000_000_000) {
    return `$${(deposits / 1_000_000_000).toFixed(1)}B`;
  } else if (deposits >= 1_000_000) {
    return `$${(deposits / 1_000_000).toFixed(1)}M`;
  } else if (deposits >= 1_000) {
    return `$${(deposits / 1_000).toFixed(1)}K`;
  }
  return `$${deposits.toFixed(0)}`;
}

// Determine if a market is active based on initialization and expiration status
export function isMarketActive(market: MarketData): boolean {
  return market.isInitialized && !market.isExpired;
}
