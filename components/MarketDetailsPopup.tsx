import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContentWithoutCloseButton,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Calendar,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  ArrowRight,
  CircleDollarSign,
  LayoutGrid,
  Loader2,
  X,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { toast } from "sonner";
import type { SurgeVariance } from "@/idl/surge_variance";
import idl from "@/idl/surge_variance.json";

// USDC token data (Devnet)
const USDC_TOKEN_ADDRESS = "F2Yuf5LrH2ySTsk1M9CHkyeb9sFnXiRjWWH1Fwy1jTrv";
const USDC_MINT = new PublicKey(USDC_TOKEN_ADDRESS);

// Program ID for Surge Variance (from IDL)

export interface MarketDetailsProps {
  id: string;
  name: string;
  address: string;
  symbol: string;
  protocol: string;
  strategy: string;
  strike?: number;
  epoch?: string;
  timestamp?: number;
  isExpired?: boolean;
  isOpen: boolean;
  onClose: () => void;
  varLongMint?: string;
  varShortMint?: string;
  usdcVault?: string;
}

// USDC token data

// Alternative RPC endpoints to try if the main one fails
const RPC_ENDPOINTS = [
  "https://api.devnet.solana.com", // Using devnet for testing
];

const MarketDetailsPopup = ({
  name,
  address,
  strategy,
  strike = 0,
  epoch,
  timestamp,
  isExpired = false,
  isOpen,
  onClose,
  varLongMint,
  varShortMint,
  usdcVault,
}: MarketDetailsProps): React.ReactElement => {
  const [amount, setAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("mint");
  const [mintType, setMintType] = useState<string>("long");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userPositions, setUserPositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState<boolean>(false);
  const [dynamicExpired, setDynamicExpired] = useState<boolean>(isExpired);

  // Get the connected wallet
  const wallet = useWallet();
  const { publicKey, connected, signTransaction, signAllTransactions } = wallet;

  // Function to fetch USDC balance using getTokenAccountBalance
  const fetchUsdcBalance = async () => {
    if (!publicKey || !connected) {
      setUsdcBalance("0");
      return;
    }

    try {
      setIsLoadingBalance(true);

      // Try multiple RPC endpoints in case some fail
      let balance = 0;
      let success = false;
      let lastError;

      for (const endpoint of RPC_ENDPOINTS) {
        try {
          const connection = new Connection(endpoint, "confirmed");

          // 1. First find all token accounts owned by this wallet for the USDC token
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { mint: USDC_MINT },
            "confirmed"
          );

          // Check if any token accounts were found
          if (tokenAccounts.value.length > 0) {
            // 2. Get the first token account (usually there's only one per token)
            const tokenAccountAddress = tokenAccounts.value[0].pubkey;

            // 3. Use getTokenAccountBalance to get the balance
            const tokenBalance = await connection.getTokenAccountBalance(
              tokenAccountAddress
            );

            // 4. Extract the UI-friendly balance amount
            balance = Number(tokenBalance.value.uiAmountString);

            console.log("USDC Token Balance:", tokenBalance);
            console.log("UI Amount:", tokenBalance.value.uiAmount);
            console.log("UI Amount String:", tokenBalance.value.uiAmountString);
          }

          success = true;
          break; // Exit the loop if successful
        } catch (error) {
          console.warn(`RPC endpoint ${endpoint} failed:`, error);
          lastError = error;
          // Continue to try the next endpoint
        }
      }

      if (!success) {
        console.error("All RPC endpoints failed:", lastError);
        setUsdcBalance("Error");
      } else {
        setUsdcBalance(
          balance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      setUsdcBalance("Error");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch USDC balance when wallet connects or component mounts
  useEffect(() => {
    fetchUsdcBalance();
    // Refresh balance every 30 seconds
    const intervalId = setInterval(fetchUsdcBalance, 30000);

    return () => clearInterval(intervalId);
  }, [publicKey, connected]);

  // Add function to fetch user token positions
  const fetchUserPositions = async () => {
    if (!publicKey || !connected || !varLongMint || !varShortMint) {
      setUserPositions([]);
      return;
    }

    try {
      setIsLoadingPositions(true);
      const connection = new Connection(RPC_ENDPOINTS[0], "confirmed");

      // Create PublicKeys for token mints
      const varLongMintPubkey = new PublicKey(varLongMint);
      const varShortMintPubkey = new PublicKey(varShortMint);

      // Get token accounts addresses
      const longTokenAta = await getAssociatedTokenAddress(
        varLongMintPubkey,
        publicKey
      );
      const shortTokenAta = await getAssociatedTokenAddress(
        varShortMintPubkey,
        publicKey
      );

      // Initialize positions array
      const positions = [];

      // Check for LONG position
      try {
        const longAccountInfo = await connection.getAccountInfo(longTokenAta);
        if (longAccountInfo) {
          // Account exists, get balance
          const longTokenBalance = await connection.getTokenAccountBalance(
            longTokenAta
          );
          if (
            longTokenBalance.value.uiAmount &&
            longTokenBalance.value.uiAmount > 0
          ) {
            positions.push({
              type: "LONG",
              amount: longTokenBalance.value.uiAmountString || "0",
              value: `$${parseFloat(
                longTokenBalance.value.uiAmountString || "0"
              ).toFixed(2)}`,
              profit: "N/A", // Would require additional data to calculate
              isProfit: true,
              mintDate: new Date().toLocaleDateString(), // Real mint date would require transaction history
              token: "USDC",
              address: longTokenAta.toString(),
            });
          }
        }
      } catch (error) {
        console.warn("Error fetching long token balance:", error);
      }

      // Check for SHORT position
      try {
        const shortAccountInfo = await connection.getAccountInfo(shortTokenAta);
        if (shortAccountInfo) {
          // Account exists, get balance
          const shortTokenBalance = await connection.getTokenAccountBalance(
            shortTokenAta
          );
          if (
            shortTokenBalance.value.uiAmount &&
            shortTokenBalance.value.uiAmount > 0
          ) {
            positions.push({
              type: "SHORT",
              amount: shortTokenBalance.value.uiAmountString || "0",
              value: `$${parseFloat(
                shortTokenBalance.value.uiAmountString || "0"
              ).toFixed(2)}`,
              profit: "N/A", // Would require additional data to calculate
              isProfit: false,
              mintDate: new Date().toLocaleDateString(), // Real mint date would require transaction history
              token: "USDC",
              address: shortTokenAta.toString(),
            });
          }
        }
      } catch (error) {
        console.warn("Error fetching short token balance:", error);
      }

      setUserPositions(positions);
      console.log("User positions:", positions);
    } catch (error) {
      console.error("Error fetching user positions:", error);
    } finally {
      setIsLoadingPositions(false);
    }
  };

  // Call fetchUserPositions when wallet connects or tab changes to positions
  useEffect(() => {
    if (activeTab === "positions" && connected) {
      fetchUserPositions();
    }
  }, [activeTab, connected, publicKey, varLongMint, varShortMint]);

  // Mock data for user positions

  // Badge classes for position types
  const longBadgeClass =
    "bg-gradient-to-r from-[#019E8C]/20 to-[#019E8C]/10 text-[#019E8C] border-0 px-3 py-1 rounded-full font-medium shadow-sm";
  const shortBadgeClass =
    "bg-gradient-to-r from-[#B079B5]/20 to-[#B079B5]/10 text-[#B079B5] border-0 px-3 py-1 rounded-full font-medium shadow-sm";

  // Update the value estimation function to only show USD value (since we only use USDC)
  useEffect(() => {
    // Only calculate if an amount is entered
    if (!amount || isNaN(parseFloat(amount))) {
      setEstimatedValue("");
      return;
    }

    const amountNum = parseFloat(amount);

    // USDC is a stablecoin, so 1 USDC ≈ $1 USD
    const dollarValue = amountNum;

    setEstimatedValue(`≈ $${dollarValue.toFixed(2)} USD`);
  }, [amount]);

  // Format epoch as date
  const formatExpiry = (epoch?: string) => {
    if (!epoch) return "Unknown";
    try {
      const epochNum = parseInt(epoch, 10);
      const expiryDate = new Date(epochNum * 1000);
      return expiryDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Add effect to check epoch vs current time
  useEffect(() => {
    if (epoch) {
      try {
        const epochTimestamp = parseInt(epoch, 10) * 1000; // Convert to milliseconds
        const currentTimestamp = Date.now();
        const isExpiredNow = currentTimestamp > epochTimestamp;

        console.log("Epoch check:", {
          epoch,
          epochTimestamp,
          currentTimestamp,
          isExpiredNow,
          epochDate: new Date(epochTimestamp).toLocaleString(),
          currentDate: new Date(currentTimestamp).toLocaleString(),
        });

        setDynamicExpired(isExpiredNow);
      } catch (err) {
        console.error("Error parsing epoch:", err);
        // Fall back to the provided isExpired prop
        setDynamicExpired(isExpired);
      }
    } else {
      setDynamicExpired(isExpired);
    }
  }, [epoch, isExpired]);

  // Properly handle mint action using Anchor and the IDL
  const handleMint = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!signTransaction) {
      toast.error("Wallet does not support transaction signing");
      return;
    }

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (dynamicExpired) {
      toast.error("This market has expired");
      return;
    }

    try {
      setIsMinting(true);

      // Set up loading notification
      toast.loading(
        `Minting ${amount} ${
          mintType === "long" ? "VAR LONG" : "VAR SHORT"
        } tokens...`
      );
      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      // Initialize the Anchor Program
      const walletAdapter = {
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: signAllTransactions!,
      };

      const provider = new AnchorProvider(connection, walletAdapter, {
        commitment: "confirmed",
      });
      anchor.setProvider(provider);

      // Initialize the program with IDL address from the file
      const program = new Program<SurgeVariance>(
        idl as SurgeVariance,
        provider
      );

      // First check if we have the required token addresses
      if (!varLongMint || !varShortMint || !usdcVault) {
        toast.error("Missing token address information", {
          description: "Please try again with a different market",
        });
        return;
      }

      const epochBN = new BN(epoch || "0");
      const timestampBN = new BN(timestamp || 0);

      // Compute market PDA
      const [marketPDA, marketBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("market"),
          Buffer.from(epochBN.toArrayLike(Buffer, "le", 8)),
          Buffer.from(timestampBN.toArrayLike(Buffer, "le", 8)),
        ],
        program.programId
      );

      // Determine which token mint to use based on position type
      const isLong = mintType === "long";

      // Get user's USDC account
      const userUsdc = await getAssociatedTokenAddress(USDC_MINT, publicKey);

      // Get user's associated VAR token account
      const varMinLongtKey = new PublicKey(varLongMint);
      const varMinShortKey = new PublicKey(varShortMint);
      const userVarLong = await getAssociatedTokenAddress(
        varMinLongtKey,
        publicKey
      );
      const userVarShort = await getAssociatedTokenAddress(
        varMinShortKey,
        publicKey
      );

      // Create a transaction to check and create token accounts if needed
      const transaction = new Transaction();

      // Check if the token accounts exist, create them if not
      try {
        // Check if long token account exists
        const longAccountInfo = await connection.getAccountInfo(userVarLong);
        if (!longAccountInfo) {
          console.log("Creating VAR Long token account...");
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userVarLong, // associatedToken
              publicKey, // owner
              varMinLongtKey // mint
            )
          );
        }

        // Check if short token account exists
        const shortAccountInfo = await connection.getAccountInfo(userVarShort);
        if (!shortAccountInfo) {
          console.log("Creating VAR Short token account...");
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              userVarShort, // associatedToken
              publicKey, // owner
              varMinShortKey // mint
            )
          );
        }

        // If we need to create any accounts, send and confirm this transaction first
        if (transaction.instructions.length > 0) {
          transaction.feePayer = publicKey;
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;

          const signedTx = await signTransaction(transaction);
          const txid = await connection.sendRawTransaction(
            signedTx.serialize()
          );
          await connection.confirmTransaction(txid, "confirmed");
          console.log("Created token accounts: ", txid);
        }
      } catch (err) {
        console.error("Error creating token accounts:", err);
        toast.error("Failed to create token accounts");
        return;
      }

      // Now proceed with minting as the accounts exist
      const bumps = {
        market: marketBump,
      };

      // Convert amount to lamports (USDC has 6 decimals)
      const amountLamports = new BN(Math.floor(parseFloat(amount) * 1_000_000));

      await program.methods
        .mintTokens(amountLamports, isLong, epochBN, timestampBN, bumps)
        .accounts({
          market: marketPDA,
          userAuthority: publicKey,
          userUsdc,
          usdcVault: new PublicKey(usdcVault),
          varLongMint: new PublicKey(varLongMint),
          varShortMint: new PublicKey(varShortMint),
          userVarLong: userVarLong,
          userVarShort: userVarShort,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .rpc();

      // Success notification
      toast.success(
        `Successfully minted ${amount} ${
          mintType === "long" ? "VAR LONG" : "VAR SHORT"
        } tokens`
      );

      // Refresh balances and positions
      fetchUsdcBalance();
      fetchUserPositions();
    } catch (error: unknown) {
      console.error("Error minting tokens:", error);
      toast.error("Failed to mint tokens", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsMinting(false);
      toast.dismiss();
    }
  };

  // Handle redeem action
  const handleRedeem = async (position?: {
    type: string;
    amount: string;
    address: string;
  }) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }

    // If position is provided, log it for debugging
    if (position) {
      console.log(
        `Redeeming ${position.type} position with amount ${position.amount}`
      );
    }

    if (!signTransaction) {
      toast.error("Wallet does not support transaction signing");
      return;
    }

    if (!varLongMint || !varShortMint || !usdcVault) {
      toast.error("Missing token address information");
      return;
    }

    try {
      // Set up loading notification
      toast.loading("Redeeming tokens...");

      const connection = new Connection(
        "https://api.devnet.solana.com",
        "confirmed"
      );

      // Initialize the Anchor Program
      const walletAdapter = {
        publicKey,
        signTransaction: signTransaction!,
        signAllTransactions: signAllTransactions!,
      };

      const provider = new AnchorProvider(connection, walletAdapter, {
        commitment: "confirmed",
      });
      anchor.setProvider(provider);

      // Initialize the program with IDL
      const program = new Program<SurgeVariance>(
        idl as SurgeVariance,
        provider
      );

      const epochBN = new BN(epoch || "0");
      const timestampBN = new BN(timestamp || 0);

      // Derive market PDA
      const [marketPDA, marketBump] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("market"),
          Buffer.from(epochBN.toArrayLike(Buffer, "le", 8)),
          Buffer.from(timestampBN.toArrayLike(Buffer, "le", 8)),
        ],
        program.programId
      );

      // Derive user's VAR token accounts
      const userVarLong = await getAssociatedTokenAddress(
        new PublicKey(varLongMint),
        publicKey
      );
      const userVarShort = await getAssociatedTokenAddress(
        new PublicKey(varShortMint),
        publicKey
      );

      // Get user's USDC account
      const userUsdc = await getAssociatedTokenAddress(USDC_MINT, publicKey);

      // Volatility stats PDA from the oracle program
      const volatilityStats = new PublicKey(
        "ESgrnS6HnQEGw6cYjZMzDZrpVkr6xQ4Ls9AGTeqEgmVj"
      );

      const bumps = {
        market: marketBump,
      };

      await program.methods
        .redeem(epochBN, timestampBN, bumps)
        .accounts({
          market: marketPDA,
          userAuthority: publicKey,
          userUsdc: userUsdc,
          usdcVault: new PublicKey(usdcVault),
          varLongMint: new PublicKey(varLongMint),
          varShortMint: new PublicKey(varShortMint),
          userVarLong: userVarLong,
          userVarShort: userVarShort,
          volatilityStats: volatilityStats,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .rpc();

      // Success notification
      toast.success("Successfully redeemed tokens");

      // Refresh balances and positions
      fetchUsdcBalance();
      fetchUserPositions();
    } catch (error: unknown) {
      console.error("Error redeeming tokens:", error);
      toast.error("Failed to redeem tokens", {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      toast.dismiss();
    }
  };

  // Status badge
  const StatusBadge = ({ isExpired }: { isExpired: boolean }) => {
    return isExpired ? (
      <Badge className="bg-gradient-to-r from-red-100/20 to-red-50/10 text-red-400 border-0 px-3 py-1 rounded-full font-medium shadow-sm">
        <AlertTriangle className="w-3 h-3 mr-1" /> Expired
      </Badge>
    ) : (
      <Badge className="bg-gradient-to-r from-[#019E8C]/20 to-[#019E8C]/5 text-[#019E8C] border-0 px-3 py-1 rounded-full font-medium shadow-sm">
        <Check className="w-3 h-3 mr-1" /> Active
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContentWithoutCloseButton className="sm:max-w-[550px] bg-gradient-to-b from-[#0a1525] to-[#0f1b35] text-white border border-[#2d3a59] shadow-2xl p-0 overflow-hidden rounded-xl">
        <DialogHeader className="p-6 border-b border-[#2d3a59] relative z-10">
          <div className="pr-6 flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300 mb-2">
                Market Details
              </DialogTitle>
              <StatusBadge isExpired={dynamicExpired} />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#192337]/80 text-gray-400 hover:text-white hover:bg-[#192337]"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="relative z-10">
          <div className="px-6 pt-4 pb-0">
            <h2 className="text-2xl font-bold text-white mb-1">{name}</h2>
            <div className="text-sm text-gray-400 mb-6 flex items-center">
              <span className="mr-2">Market ID:</span>
              <Badge
                variant="outline"
                className="bg-[#1a253b]/80 text-gray-300 border-[#2d3a59] px-2 py-0.5 font-mono text-xs hover:bg-[#1a253b]"
              >
                {address.slice(0, 8)}...{address.slice(-4)}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-br from-[#192337] to-[#1a253b] rounded-xl p-4 shadow-md border border-[#2d3a59]/50">
                <div className="text-sm text-gray-400 mb-1">Strike</div>
                <div className="text-xl font-bold text-white flex items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#019E8C]/20 mr-2">
                    <TrendingUp className="w-3 h-3 text-[#019E8C]" />
                  </div>
                  {(strike * 100).toFixed(2)}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#192337] to-[#1a253b] rounded-xl p-4 shadow-md border border-[#2d3a59]/50">
                <div className="text-sm text-gray-400 mb-1">Expiry</div>
                <div className="text-xl font-bold text-white flex items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#B079B5]/20 mr-2">
                    <Calendar className="w-3 h-3 text-[#B079B5]" />
                  </div>
                  {formatExpiry(epoch)}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#192337] to-[#1a253b] rounded-xl p-4 mb-6 shadow-md border border-[#2d3a59]/50">
              <div className="text-sm text-gray-400 mb-1">Strategy</div>
              <div className="flex items-center">
                <Badge
                  variant="outline"
                  className="bg-gradient-to-r from-[#019E8C]/20 to-[#019E8C]/10 text-[#019E8C] border-0 px-3 py-1 rounded-full font-medium shadow-sm"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  {strategy}
                </Badge>
              </div>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 bg-[#192337] p-1 rounded-lg mb-4 shadow-inner">
                <TabsTrigger
                  value="mint"
                  className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#019E8C] data-[state=active]:to-[#018b7c] data-[state=active]:text-white"
                >
                  <CircleDollarSign className="w-4 h-4 mr-2" />
                  Mint Tokens
                </TabsTrigger>
                <TabsTrigger
                  value="positions"
                  className="rounded-md data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#B079B5] data-[state=active]:to-[#9d6aaa] data-[state=active]:text-white"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  My Positions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="mint"
              className="px-6 pb-6 pt-2 animate-in fade-in-50 duration-300"
            >
              {dynamicExpired ? (
                <div className="bg-[#192337]/80 rounded-xl p-6 text-center border border-[#2d3a59]/50 mb-6">
                  <div className="w-12 h-12 rounded-full bg-[#192337] border border-[#2d3a59] flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-6 h-6 text-[#B079B5]" />
                  </div>
                  <h4 className="text-white font-medium mb-1">
                    Market Has Expired
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    This market has expired on {formatExpiry(epoch)}. You can no
                    longer mint new positions, but you can redeem existing
                    positions.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] hover:from-[#9d6aaa] hover:to-[#8a5994] text-white"
                    onClick={() => setActiveTab("positions")}
                  >
                    View Your Positions
                  </Button>
                  <Button
                    className="mt-2 w-full bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] hover:from-[#9d6aaa] hover:to-[#8a5994] text-white"
                    onClick={() => handleRedeem()}
                  >
                    <CircleDollarSign className="w-4 h-4 mr-2" />
                    Redeem Settlement
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-[#019E8C]" />
                    Mint VAR {mintType === "long" ? "LONG" : "SHORT"} Position
                  </h3>

                  <div className="space-y-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-gray-400 mb-1">
                          Market Strike
                        </div>
                        <div className="text-white font-medium text-lg">
                          {strike === undefined
                            ? "N/A"
                            : `${(strike * 100).toFixed(2)}%`}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-400 mb-1">
                          Expires
                        </div>
                        <div className="text-white font-medium text-lg flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {formatExpiry(epoch)}
                        </div>
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-sm text-gray-400 mb-1">Status</div>
                        <StatusBadge isExpired={dynamicExpired} />
                      </div>
                    </div>

                    <div className="bg-[#192337]/80 rounded-xl p-4 border border-[#2d3a59]/50">
                      <h4 className="text-white font-medium mb-3">
                        Choose Position
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          className={`rounded-lg py-3 h-16 flex flex-col items-center justify-center ${
                            mintType === "long"
                              ? "bg-gradient-to-r from-[#019E8C] to-[#018b7c] text-white"
                              : "bg-[#192337] border border-[#2d3a59] text-gray-300 hover:bg-[#1f293d]"
                          }`}
                          onClick={() => setMintType("long")}
                        >
                          <ArrowUpRight
                            className={`h-5 w-5 mb-1 ${
                              mintType === "long"
                                ? "text-white"
                                : "text-[#019E8C]"
                            }`}
                          />
                          <span>VAR LONG</span>
                        </Button>
                        <Button
                          className={`rounded-lg py-3 h-16 flex flex-col items-center justify-center ${
                            mintType === "short"
                              ? "bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] text-white"
                              : "bg-[#192337] border border-[#2d3a59] text-gray-300 hover:bg-[#1f293d]"
                          }`}
                          onClick={() => setMintType("short")}
                        >
                          <ArrowDownRight
                            className={`h-5 w-5 mb-1 ${
                              mintType === "short"
                                ? "text-white"
                                : "text-[#B079B5]"
                            }`}
                          />
                          <span>VAR SHORT</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-gray-400">Amount</div>
                      <div className="text-sm text-gray-400 flex items-center">
                        Available:{" "}
                        {isLoadingBalance ? (
                          <Loader2 className="ml-1 h-3 w-3 animate-spin text-white" />
                        ) : (
                          <span className="text-white ml-1">
                            {connected
                              ? `${usdcBalance} USDC`
                              : "Connect wallet"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-[#192337] border-[#2d3a59] focus:border-[#019E8C] focus:ring-[#019E8C]/20 text-white px-4 py-3 h-12 rounded-lg shadow-inner"
                        />
                        {estimatedValue && (
                          <div className="absolute -bottom-6 left-0 text-xs text-gray-400">
                            {estimatedValue}
                          </div>
                        )}
                      </div>
                      <div className="bg-[#192337] border border-[#2d3a59] rounded-lg h-12 px-3 flex items-center shadow-md">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-[#2775CA]"></div>
                          <span className="text-white">USDC</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-[#019E8C]">
                      Using USDC token ({USDC_TOKEN_ADDRESS.slice(0, 4)}...
                      {USDC_TOKEN_ADDRESS.slice(-4)})
                    </div>
                  </div>

                  <div>
                    <Button
                      className={`w-full rounded-lg h-12 group relative overflow-hidden ${
                        mintType === "long"
                          ? "bg-gradient-to-r from-[#019E8C] to-[#018b7c] hover:from-[#018b7c] hover:to-[#017a6d]"
                          : "bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] hover:from-[#9d6aaa] hover:to-[#8a5994]"
                      }`}
                      onClick={handleMint}
                      disabled={
                        !amount || dynamicExpired || !connected || isMinting
                      }
                    >
                      <span
                        className="absolute inset-0 w-full h-full transition-all duration-300 ease-out transform translate-x-0 
                        group-hover:translate-x-full bg-gradient-to-r from-white/5 to-transparent"
                      ></span>
                      <span className="relative flex items-center justify-center">
                        {isMinting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Minting...
                          </>
                        ) : (
                          <>
                            {mintType === "long"
                              ? "Mint VAR LONG"
                              : "Mint VAR SHORT"}
                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </span>
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent
              value="positions"
              className="px-6 pb-6 pt-2 animate-in fade-in-50 slide-in-from-right-5 duration-300"
            >
              <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                <LayoutGrid className="w-4 h-4 mr-2 text-[#B079B5]" />
                Your Positions
              </h3>

              {isLoadingPositions ? (
                <div className="bg-[#192337]/80 rounded-xl p-6 text-center border border-[#2d3a59]/50">
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#B079B5]" />
                    <span>Loading your positions...</span>
                  </div>
                </div>
              ) : userPositions.length > 0 ? (
                <div className="space-y-4">
                  {userPositions.map((position, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-[#192337] to-[#1a253b] rounded-xl p-4 border border-[#2d3a59]/50 shadow-md"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <Badge
                          className={
                            position.type === "LONG"
                              ? longBadgeClass
                              : shortBadgeClass
                          }
                        >
                          {position.type === "LONG" ? (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 mr-1" />
                          )}
                          VAR {position.type}
                        </Badge>
                        <div
                          className={`text-sm font-medium ${
                            position.isProfit
                              ? "text-green-400"
                              : "text-gray-400"
                          }`}
                        >
                          {position.profit}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="text-gray-400">Amount</div>
                          <div className="text-white font-medium">
                            {position.amount} tokens
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Value</div>
                          <div className="text-white font-medium">
                            {position.value}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Minted</div>
                          <div className="text-white">{position.mintDate}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Token Used</div>
                          <div className="text-white flex items-center">
                            <div className="w-3 h-3 rounded-full mr-1 bg-[#2775CA]"></div>
                            {position.token}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#2d3a59]">
                        <Button
                          className="w-full bg-gradient-to-r from-[#192337] to-[#1a253b] text-white hover:from-[#1a253b] hover:to-[#1f2e45] border border-[#2d3a59]"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              `https://explorer.solana.com/address/${position.address}?cluster=devnet`,
                              "_blank"
                            )
                          }
                        >
                          View on Explorer
                        </Button>

                        {/* Redemption button for expired markets */}
                        {dynamicExpired && (
                          <Button
                            className="w-full mt-2 bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] hover:from-[#9d6aaa] hover:to-[#8a5994] text-white"
                            onClick={() => handleRedeem(position)}
                          >
                            <CircleDollarSign className="w-4 h-4 mr-2" />
                            Redeem Position
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#192337]/80 rounded-xl p-6 text-center border border-[#2d3a59]/50">
                  <div className="w-12 h-12 rounded-full bg-[#192337] border border-[#2d3a59] flex items-center justify-center mx-auto mb-3">
                    <Wallet className="w-6 h-6 text-gray-400" />
                  </div>
                  <h4 className="text-white font-medium mb-1">
                    No positions found
                  </h4>
                  <p className="text-gray-400 text-sm mb-4">
                    You don&apos;t have any minted tokens for this market yet.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] hover:from-[#9d6aaa] hover:to-[#8a5994] text-white"
                    onClick={() => setActiveTab("mint")}
                  >
                    Mint New Tokens
                  </Button>
                </div>
              )}

              {connected && userPositions.length === 0 && dynamicExpired && (
                <div className="mt-4 p-4 border border-[#2d3a59] rounded-lg bg-[#B079B5]/10">
                  <h4 className="text-white font-medium mb-2 flex items-center">
                    <CircleDollarSign className="w-4 h-4 mr-2 text-[#B079B5]" />
                    Market Settlement
                  </h4>
                  <p className="text-gray-300 text-sm mb-3">
                    This market has expired. If you previously held positions,
                    you can redeem your profit or loss.
                  </p>
                  <Button
                    className="w-full bg-gradient-to-r from-[#B079B5] to-[#9d6aaa] hover:from-[#9d6aaa] hover:to-[#8a5994] text-white"
                    onClick={() => handleRedeem()}
                  >
                    <CircleDollarSign className="w-4 h-4 mr-2" />
                    Redeem Settlement
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContentWithoutCloseButton>
    </Dialog>
  );
};

export default MarketDetailsPopup;
