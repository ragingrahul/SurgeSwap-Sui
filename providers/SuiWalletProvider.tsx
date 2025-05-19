"use client";

import { ReactNode, useState, useEffect } from "react";
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import dynamic from "next/dynamic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider as SuietWalletProvider } from "@suiet/wallet-kit";

// Create a client for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

// Define network configurations
const networkConfig = {
  devnet: { url: getFullnodeUrl("devnet") },
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

type ClientWalletProviderProps = {
  children: ReactNode;
};

// Create a client-side only provider component
const ClientWalletProvider = ({ children }: ClientWalletProviderProps) => {
  const [mounted, setMounted] = useState(false);

  // Only render wallet components when on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  console.log("Mounting Sui wallet provider");

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect={false}>
          <SuietWalletProvider>
            {mounted && <>{children}</>}
          </SuietWalletProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

// Dynamically import the provider to ensure it only runs on the client side
const SuiWalletProviderDynamic = dynamic(
  () => Promise.resolve(ClientWalletProvider),
  {
    ssr: false,
  }
);

export default function WalletWrapper({ children }: { children: ReactNode }) {
  return <SuiWalletProviderDynamic>{children}</SuiWalletProviderDynamic>;
}
