"use client";

import { useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import dynamic from "next/dynamic";
import { ReactNode, useState, useEffect } from "react";

// Import the wallet adapter CSS - we'll keep this for the base styles
import "@solana/wallet-adapter-react-ui/styles.css";

// Create a custom error handler for the wallet provider
const onError = (error: Error) => {
  // Suppress "User rejected" errors which happen when users cancel connections
  if (
    error.message.includes("User rejected") ||
    error.name === "WalletConnectionError" ||
    error.message.includes("wallet adapter connection error") ||
    error.message.includes("connection error")
  ) {
    // Silently handle expected user rejection scenarios
    console.log("Wallet connection cancelled by user");
    return;
  }

  // Log other errors to console but don't display to user
  console.error("Wallet error:", error);
};

// Create a dynamic component to prevent hydration errors
const ClientWalletProvider = ({ children }: { children: ReactNode }) => {
  const [mounted, setMounted] = useState(false);

  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network]
  );

  // Only render wallet components when on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        {mounted && children}
      </WalletProvider>
    </ConnectionProvider>
  );
};

// Dynamically import the provider to ensure it only runs on the client side
const SolanaWalletProvider = dynamic(
  () => Promise.resolve(ClientWalletProvider),
  {
    ssr: false,
  }
);

export default function WalletWrapper({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
