"use client";

import { useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SurgePerpsClient } from "./surgePerpsUtils";
import { toast } from "sonner";

/**
 * Hook that provides access to SurgePerpsClient instance
 */
export function useSurgePerpsClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  /**
   * Create a client for interacting with the Surge Perps program
   */
  const getClient = useCallback(() => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("Wallet not connected");
    }

    // Create wallet object with non-null publicKey
    const walletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };

    return new SurgePerpsClient(connection, walletAdapter);
  }, [
    connection,
    wallet.publicKey,
    wallet.signTransaction,
    wallet.signAllTransactions,
  ]);

  /**
   * Open a position
   */
  const openPosition = useCallback(
    async (direction: "long" | "short", marginAmount: number) => {
      try {
        if (!wallet.connected || !wallet.publicKey) {
          toast.error("Please connect your wallet first");
          return null;
        }

        const client = getClient();
        const signature = await client.openPosition(direction, marginAmount);

        toast.success(
          `Position opened successfully! Transaction: ${signature.substring(
            0,
            8
          )}...`
        );
        return signature;
      } catch (err) {
        console.error("Error opening position:", err);
        const message =
          err instanceof Error ? err.message : "Failed to open position";
        toast.error(message);
        return null;
      }
    },
    [wallet.connected, wallet.publicKey, getClient]
  );

  /**
   * Close a position
   */
  const closePosition = useCallback(
    async (checkTokenBalance: boolean = false) => {
      try {
        if (!wallet.connected || !wallet.publicKey) {
          toast.error("Please connect your wallet first");
          return null;
        }

        const client = getClient();
        const signature = await client.closePosition(checkTokenBalance);

        toast.success(
          `Position closed successfully! Transaction: ${signature.substring(
            0,
            8
          )}...`
        );
        return signature;
      } catch (err) {
        console.error("Error closing position:", err);
        const message =
          err instanceof Error ? err.message : "Failed to close position";
        toast.error(message);
        return null;
      }
    },
    [wallet.connected, wallet.publicKey, getClient]
  );

  /**
   * Fetch position data
   */
  const fetchPositionData = useCallback(async () => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        return null;
      }

      const client = getClient();
      return await client.getPositionData();
    } catch (err) {
      console.error("Error fetching position data:", err);
      return null;
    }
  }, [wallet.connected, wallet.publicKey, getClient]);

  /**
   * Reset the position state - closes any existing position with force
   */
  const resetPosition = useCallback(async () => {
    try {
      if (!wallet.connected || !wallet.publicKey) {
        toast.error("Please connect your wallet first");
        return null;
      }

      const client = getClient();
      const positionData = await client.getPositionData();

      if (!positionData) {
        console.log(
          "No position data found - initializing position account directly"
        );

        try {
          // Initialize the position account directly
          const signature = await client.initializePositionAccount();
          console.log("Position account initialized:", signature);
          toast.success("Position account initialized successfully");
          return signature;
        } catch (err) {
          console.error("Error during position initialization:", err);
          throw new Error("Failed to initialize position account");
        }
      }

      // Force close the position
      const signature = await client.closePosition(true);

      if (signature) {
        toast.success("Position reset successfully");
      }
      return signature;
    } catch (err) {
      console.error("Error resetting position:", err);
      const message =
        err instanceof Error ? err.message : "Failed to reset position";
      toast.error(message);
      return null;
    }
  }, [wallet.connected, wallet.publicKey, getClient]);

  return {
    openPosition,
    closePosition,
    fetchPositionData,
    resetPosition,
    wallet,
  };
}

export default useSurgePerpsClient;
