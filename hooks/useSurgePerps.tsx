"use client";

import { useCallback, useState, useEffect } from "react";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

// Import the IDL as a JSON file
import idl from "../idl/surge_perps.json";

// Constants
const USDC_DEV = new PublicKey("F2Yuf5LrH2ySTsk1M9CHkyeb9sFnXiRjWWH1Fwy1jTrv");
const VAULT_TOKEN_ACCOUNT = new PublicKey(
  "CHEJa5JSSngdQFcGjvYVABxA2y3jAML4nwZ9bCMJSd9G"
);
const VOLATILITY_STATS = new PublicKey(
  "ESgrnS6HnQEGw6cYjZMzDZrpVkr6xQ4Ls9AGTeqEgmVj"
);
const PROGRAM_ID = new PublicKey(
  "GjMYNFqnZbAVoUoKxsYSaexT3AnXmHz1m8nMjH9Wxmdu"
);

export type PositionData = {
  owner: PublicKey;
  direction: { long: Record<string, never> } | { short: Record<string, never> };
  entryVol: number;
  size: anchor.BN;
  margin: anchor.BN;
  bump: number;
  createdAt: anchor.BN;
  isActive: boolean;
};

export function useSurgePerps() {
  const { connection } = useConnection();
  const { publicKey, connected, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [positionData, setPositionData] = useState<PositionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper function to create an Anchor provider
  const getProvider = useCallback(() => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    const wallet = {
      publicKey,
      signTransaction,
      // Allow optional signAllTransactions but don't actually use it
      // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
      signAllTransactions: async (txs: any[]) => {
        throw new Error("signAllTransactions not implemented");
      },
    };

    // Cast to unknown first to avoid TypeScript errors
    const provider = new anchor.AnchorProvider(
      connection,
      wallet as unknown as anchor.Wallet,
      { commitment: "confirmed" }
    );

    return provider;
  }, [connection, publicKey, signTransaction]);

  // Helper to create the program instance
  const getProgram = useCallback(() => {
    try {
      const provider = getProvider();

      // Use the imported IDL object directly
      return new anchor.Program(idl, provider);
    } catch (err) {
      console.error("Failed to get program:", err);
      throw err;
    }
  }, [getProvider]);

  // Get PDAs
  const getPositionPda = useCallback(() => {
    if (!publicKey) return null;

    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), publicKey.toBuffer()],
      PROGRAM_ID
    );
    return positionPda;
  }, [publicKey]);

  const getVaultConfigPda = useCallback(() => {
    const [vaultConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_config")],
      PROGRAM_ID
    );
    return vaultConfigPda;
  }, []);

  const getSyntheticMintTokenPda = useCallback(() => {
    const [syntheticMintTokenPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("synthetic_mint_token")],
      PROGRAM_ID
    );
    return syntheticMintTokenPda;
  }, []);

  // Get position data
  const fetchPositionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!publicKey || !connected) {
        setPositionData(null);
        return null;
      }

      const program = getProgram();
      const positionPda = getPositionPda();

      if (!positionPda) {
        setPositionData(null);
        return null;
      }

      try {
        // Fetch position account - needs to access through 'program.account' namespace
        // Using 'any' type to bypass TypeScript checking for program.account.position
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await (program as any).account.position.fetch(positionPda);
        setPositionData(data as unknown as PositionData);
        return data;
      } catch (err) {
        // Position likely doesn't exist yet
        console.log("No active position found", err);
        setPositionData(null);
        return null;
      }
    } catch (err) {
      console.error("Error fetching position data:", err);
      setError(
        typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : "Failed to fetch position data"
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, getProgram, getPositionPda]);

  // Initialize by fetching position data
  useEffect(() => {
    if (publicKey && connected) {
      fetchPositionData().catch((err) => {
        console.error("Failed to fetch position data:", err);
      });
    }
  }, [publicKey, connected, fetchPositionData]);

  // Open a position
  const openPosition = useCallback(
    async (
      direction: "long" | "short",
      marginAmount: number
    ): Promise<string | null> => {
      try {
        setLoading(true);
        setError(null);

        if (!publicKey || !signTransaction || !connected) {
          toast.error("Please connect your wallet first");
          throw new Error("Wallet not connected");
        }

        // Get the program
        const program = getProgram();

        // Convert direction to enum format
        const directionEnum =
          direction === "long"
            ? { long: {} as Record<string, never> }
            : { short: {} as Record<string, never> };

        // Convert margin to anchor BN with proper decimal places (USDC has 6)
        const margin = new anchor.BN(marginAmount * 1e6);

        // Get PDAs
        const positionPda = getPositionPda();
        const vaultConfigPda = getVaultConfigPda();
        const syntheticMintTokenPda = getSyntheticMintTokenPda();

        if (!positionPda) {
          throw new Error("Failed to derive position PDA");
        }

        // Get user's ATAs
        const userUsdc = getAssociatedTokenAddressSync(USDC_DEV, publicKey);

        const userVvol = getAssociatedTokenAddressSync(
          syntheticMintTokenPda,
          publicKey
        );

        // Add compute budget instruction (needed for complex transactions)
        const computeBudget =
          anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 400000,
          });

        // Create transaction
        const tx = new Transaction().add(computeBudget);

        // Add instruction to open position - using any to bypass TypeScript checking
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const openPositionIx = await (program as any).methods
          .openPosition(directionEnum, margin)
          .accounts({
            owner: publicKey,
            userUsdc,
            vault: VAULT_TOKEN_ACCOUNT,
            position: positionPda,
            syntheticMint: syntheticMintTokenPda,
            userVvol,
            volatilityStats: VOLATILITY_STATS,
            vaultConfig: vaultConfigPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        tx.add(openPositionIx);
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Send the transaction
        const signedTx = await signTransaction(tx);
        const signature = await connection.sendRawTransaction(
          signedTx.serialize()
        );

        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");

        // Refresh position data
        await fetchPositionData();

        return signature;
      } catch (err) {
        console.error("Error opening position:", err);
        const errorMessage =
          typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Failed to open position";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      publicKey,
      signTransaction,
      connected,
      getProgram,
      getPositionPda,
      getVaultConfigPda,
      getSyntheticMintTokenPda,
      connection,
      fetchPositionData,
    ]
  );

  // Close a position
  const closePosition = useCallback(
    async (checkTokenBalance: boolean = false): Promise<string | null> => {
      try {
        setLoading(true);
        setError(null);

        if (!publicKey || !signTransaction || !connected) {
          toast.error("Please connect your wallet first");
          throw new Error("Wallet not connected");
        }

        // Get the program
        const program = getProgram();

        // Get PDAs
        const positionPda = getPositionPda();
        const vaultConfigPda = getVaultConfigPda();
        const syntheticMintTokenPda = getSyntheticMintTokenPda();

        if (!positionPda) {
          throw new Error("Failed to derive position PDA");
        }

        // Get user's ATAs
        const userUsdc = getAssociatedTokenAddressSync(USDC_DEV, publicKey);

        const userVvol = getAssociatedTokenAddressSync(
          syntheticMintTokenPda,
          publicKey
        );

        // Add compute budget instruction
        const computeBudget =
          anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 400000,
          });

        // Create transaction
        const tx = new Transaction().add(computeBudget);

        // Add instruction to close position
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const closePositionIx = await (program as any).methods
          .closePosition(checkTokenBalance)
          .accounts({
            owner: publicKey,
            userUsdc,
            vault: VAULT_TOKEN_ACCOUNT,
            position: positionPda,
            syntheticMint: syntheticMintTokenPda,
            userVvol,
            volatilityStats: VOLATILITY_STATS,
            vaultConfig: vaultConfigPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();

        tx.add(closePositionIx);
        tx.feePayer = publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        // Send the transaction
        const signedTx = await signTransaction(tx);
        const signature = await connection.sendRawTransaction(
          signedTx.serialize()
        );

        // Wait for confirmation
        await connection.confirmTransaction(signature, "confirmed");

        // Refresh position data
        await fetchPositionData();

        return signature;
      } catch (err) {
        console.error("Error closing position:", err);
        const errorMessage =
          typeof err === "object" && err !== null && "message" in err
            ? String(err.message)
            : "Failed to close position";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      publicKey,
      signTransaction,
      connected,
      getProgram,
      getPositionPda,
      getVaultConfigPda,
      getSyntheticMintTokenPda,
      connection,
      fetchPositionData,
    ]
  );

  return {
    openPosition,
    closePosition,
    fetchPositionData,
    positionData,
    loading,
    error,
    publicKey,
    connected,
  };
}

export default useSurgePerps;
