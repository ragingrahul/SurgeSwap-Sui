import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, clusterApiUrl } from "@solana/web3.js";
import type { SurgeOracle } from "../idl/surge_oracle";
import idl from "../idl/surge_oracle.json";

// Define the volatility data interface
export interface VolatilityData {
  annualizedVolatility: number;
  lastPrice: number;
  mean: number;
  m2: number;
  count: number;
  authority: string;
}

function makeWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signTransaction: async (tx: any) => {
      tx.partialSign(keypair);
      return tx;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    signAllTransactions: async (txs: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return txs.map((tx: any) => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
}

export async function fetchVolatilityData(): Promise<VolatilityData | null> {
  try {
    const wallet = Keypair.generate();
    const connection = new Connection(clusterApiUrl("devnet"));
    const newWallet = makeWallet(wallet);
    const provider = new AnchorProvider(connection, newWallet, {
      commitment: "processed",
    });
    anchor.setProvider(provider);

    const program = new Program<SurgeOracle>(idl as SurgeOracle, provider); // adjust name

    // 2️⃣  PDA you want to read ------------------------------------------------------------------------
    const VOL_STATS_PDA = new PublicKey(
      "ESgrnS6HnQEGw6cYjZMzDZrpVkr6xQ4Ls9AGTeqEgmVj"
    );

    const stats = await program.account.volatilityStats.fetch(VOL_STATS_PDA);

    const lastPrice = stats.lastPrice.toNumber() / 1_000_000;
    const mean = stats.mean;
    const m2 = stats.m2;
    const count = stats.count.toNumber();
    const annVol = stats.annualizedVolatility;

    return {
      annualizedVolatility: annVol,
      lastPrice: lastPrice,
      mean: mean,
      m2: m2,
      count: count,
      authority: VOL_STATS_PDA.toBase58(),
    };
  } catch (error) {
    console.error("Error fetching volatility data:", error);
    return null;
  }
}
