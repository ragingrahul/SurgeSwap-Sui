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
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useSuiVolatility } from "@/hooks/useSuiVolatility";
import { useWallet } from "@suiet/wallet-kit";
// Import the useTransactionExecution hook
import { useTransactionExecution } from "@/hooks/useTransactionExecution";
// Import wallet kit CSS
import "@suiet/wallet-kit/style.css";

// Specify the network to use
const NETWORK = "testnet";

// USDC token type on Sui
const USDC_TOKEN_TYPE =
  "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

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
  startVolatility?: number;
  realizedVariance?: number;
  currentVol?: number;
  authority?: string;
}

const MarketDetailsPopup: React.FC<MarketDetailsProps> = ({
  name,
  address,
  symbol,
  protocol,
  strategy,
  strike,
  epoch,
  timestamp,
  isExpired = false,
  isOpen,
  onClose,
  startVolatility,
  realizedVariance,
  currentVol: propCurrentVol,
  authority,
}: MarketDetailsProps): React.ReactElement => {
  const [amount, setAmount] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("mint");
  const [mintType, setMintType] = useState<string>("long");
  const [estimatedValue, setEstimatedValue] = useState<string>("");
  const [usdcBalance, setUsdcBalance] = useState<string>("0");
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [userPositions, setUserPositions] = useState<
    Array<{
      type: string;
      amount: string;
      value: string;
      profit: string;
      isProfit: boolean;
      mintDate: string;
      address: string;
    }>
  >([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState<boolean>(false);
  const [dynamicExpired, setDynamicExpired] = useState<boolean>(isExpired);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // Get live volatility data from the Sui hook
  const { annualizedVolatility, loading: volatilityLoading } =
    useSuiVolatility();

  // Use the volatility from the hook if available, otherwise fall back to the prop
  const currentVol = annualizedVolatility
    ? annualizedVolatility
    : propCurrentVol;

  // Use Sui wallet hooks
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  // Use the wallet kit for signAndExecuteTransactionBlock (needed for Connect Wallet button)
  const wallet = useWallet();

  // Check if wallet is connected
  const connected = !!currentAccount;
  const walletAddress = currentAccount?.address;

  // Add the useTransactionExecution hook
  const executeTransaction = useTransactionExecution();

  // Function to fetch USDC balance
  const fetchUsdcBalance = async () => {
    if (!walletAddress || !connected) {
      setUsdcBalance("0");
      return;
    }

    try {
      setIsLoadingBalance(true);

      // Fetch USDC coins owned by address
      const coinsData = await suiClient.getCoins({
        owner: walletAddress,
        coinType: USDC_TOKEN_TYPE,
      });

      // Calculate total balance
      const totalBalance = coinsData.data.reduce(
        (acc, coin) => acc + BigInt(coin.balance),
        BigInt(0)
      );

      // Format balance (USDC typically has 6 decimals)
      const formattedBalance = (Number(totalBalance) / 1_000_000).toFixed(2);

      setUsdcBalance(formattedBalance);
    } catch (error) {
      console.error("Error fetching USDC balance:", error);
      setUsdcBalance("0");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Fetch balance when wallet connects or component mounts
  useEffect(() => {
    if (connected) {
      fetchUsdcBalance();
      // Refresh balance every 30 seconds
      const intervalId = setInterval(fetchUsdcBalance, 30000);
      return () => clearInterval(intervalId);
    }
  }, [connected, walletAddress]);

  // Add function to fetch user positions
  const fetchUserPositions = async () => {
    if (!walletAddress || !connected) {
      setUserPositions([]);
      return;
    }

    try {
      setIsLoadingPositions(true);

      // This would need to be implemented based on your contract's specifics
      // For now, we'll just set empty positions
      setUserPositions([]);
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
  }, [activeTab, connected, walletAddress]);

  // Badge classes for position types
  const longBadgeClass =
    "bg-[#019E8C]/20 text-[#019E8C] border-0 px-3 py-1 rounded-full font-medium";
  const shortBadgeClass =
    "bg-[#B079B5]/20 text-[#B079B5] border-0 px-3 py-1 rounded-full font-medium";

  // Update the value estimation function
  useEffect(() => {
    // Only calculate if an amount is entered
    if (!amount || isNaN(parseFloat(amount))) {
      setEstimatedValue("");
      return;
    }

    const amountNum = parseFloat(amount);
    const dollarValue = amountNum;
    setEstimatedValue(`≈ $${dollarValue.toFixed(2)} USD`);
  }, [amount]);

  // Format epoch as date
  const formatExpiry = (timestamp?: number, epoch?: string) => {
    if (!timestamp || !epoch) return "Unknown";
    try {
      const epochNum = parseInt(epoch, 10);
      const expiryDate = new Date((timestamp + epochNum) * 1000);
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
    if (timestamp && epoch) {
      try {
        const epochNum = parseInt(epoch, 10);
        const expiryTimestamp = (timestamp + epochNum) * 1000; // Convert to milliseconds
        const currentTimestamp = Date.now();
        const isExpiredNow = currentTimestamp > expiryTimestamp;

        console.log("Epoch check:", {
          epoch,
          timestamp,
          expiryTimestamp,
          currentTimestamp,
          isExpiredNow,
          expiryDate: new Date(expiryTimestamp).toLocaleString(),
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
  }, [epoch, timestamp, isExpired]);

  // Function to handle minting with Sui
  const handleMint = async () => {
    if (!connected || !walletAddress) {
      toast.error("Please connect your wallet first");
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
      toast.loading(
        `Minting ${amount} ${
          mintType === "long" ? "VAR LONG" : "VAR SHORT"
        } tokens...`
      );

      if (!address) {
        throw new Error("Market address is missing");
      }

      // Convert amount to Sui u64 format (USDC has 6 decimals)
      const amountInMicroUSDC = BigInt(
        Math.floor(parseFloat(amount) * 1_000_000)
      );

      try {
        console.log("Creating transaction...");
        // Create a proper transaction block
        const txb = new Transaction();

        // Get the available USDC coins for payment
        const { data: coins } = await suiClient.getCoins({
          owner: walletAddress,
          coinType: USDC_TOKEN_TYPE,
        });

        if (coins.length === 0) {
          throw new Error("No USDC tokens available in wallet");
        }

        // Find a coin with the exact amount or split one
        const exactCoin = coins.find(
          (c) => c.balance === amountInMicroUSDC.toString()
        );

        if (exactCoin) {
          // Use the exact coin
          console.log("Using exact coin for transaction");
          txb.moveCall({
            target: `0xaf4b4cc5cbcd40d5e8c6ae8c2695dd58d23dedfd4949e1903765559be853119c::variance_swap::deposit_and_mint`,
            typeArguments: [USDC_TOKEN_TYPE],
            arguments: [
              txb.object(address),
              txb.pure.u64(amountInMicroUSDC),
              txb.pure.bool(mintType === "long"),
              txb.object(exactCoin.coinObjectId),
            ],
          });
        } else {
          // Need to split a coin to get exact amount
          console.log("Splitting coin to get exact amount");
          const largeCoin = coins.find(
            (c) => BigInt(c.balance) > amountInMicroUSDC
          );

          if (!largeCoin) {
            throw new Error("Not enough USDC balance for this transaction");
          }

          console.log("Found large coin with balance:", largeCoin.balance);

          // Split the coin to get exact amount
          const [splitCoin] = txb.splitCoins(
            txb.object(largeCoin.coinObjectId),
            [txb.pure.u64(amountInMicroUSDC)]
          );

          // Use the split coin (with exact amount)
          txb.moveCall({
            target: `0xaf4b4cc5cbcd40d5e8c6ae8c2695dd58d23dedfd4949e1903765559be853119c::variance_swap::deposit_and_mint`,
            typeArguments: [USDC_TOKEN_TYPE],
            arguments: [
              txb.object(address),
              txb.pure.u64(amountInMicroUSDC),
              txb.pure.bool(mintType === "long"),
              splitCoin, // Use the split coin with exact amount
            ],
          });
        }

        console.log("Transaction block created:", txb);

        // Use the executeTransaction hook instead of directly calling wallet methods
        console.log("Signing and executing transaction...");
        const response = await executeTransaction(txb);

        console.log("Transaction executed:", response);

        toast.success(
          `Successfully initiated mint transaction for ${amount} ${
            mintType === "long" ? "VAR LONG" : "VAR SHORT"
          } tokens!`
        );
      } catch (txError) {
        console.error("Transaction error:", txError);
        toast.error("Failed to execute transaction", {
          description:
            txError instanceof Error ? txError.message : "Unknown error",
        });
      }

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

  // Simplified function to handle redeeming
  const handleRedeem = async () => {
    if (!connected || !walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      toast.loading("Redeeming tokens...");

      // Here you would implement the actual redemption logic
      // For demo, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Successfully redeemed tokens (simulation)");

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
      <Badge className="bg-red-500/20 text-red-400 border-0 px-3 py-1 rounded-full font-medium">
        <AlertTriangle className="w-3 h-3 mr-1" /> Expired
      </Badge>
    ) : (
      <Badge className="bg-[#019E8C]/20 text-[#019E8C] border-0 px-3 py-1 rounded-full font-medium">
        <Check className="w-3 h-3 mr-1" /> Active
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContentWithoutCloseButton className="sm:max-w-[550px] bg-[#0c1424] text-white border-0 p-0 overflow-hidden rounded-xl shadow-2xl">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <span className="text-[#44b49c] mr-2">{name}</span>
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 text-xs bg-[#1e2a3d] text-gray-300"
                >
                  {symbol}
                </Badge>
              </DialogTitle>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-gray-400 hover:text-white hover:bg-[#1e2a3d]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-gray-400 mt-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center">
                <span className="inline-block w-3 h-3 bg-[#44b49c] rounded-full mr-1"></span>
                {protocol}
              </span>
              <span className="flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                {strategy}
              </span>
            </div>

            {!connected && (
              <div className="text-xs text-[#44b49c]">Wallet not connected</div>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 space-y-4">
          {/* Market Info Card */}
          <div className="bg-[#19233a] rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-medium text-[#44b49c]">
                Market Overview
              </h2>
              <StatusBadge isExpired={dynamicExpired} />
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Market ID</div>
                <div
                  className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded"
                  title={address}
                >
                  {address.slice(0, 14)}...{address.slice(-6)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">
                  Volatility Strike
                </div>
                <div className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded">
                  {strike ? `${strike.toFixed(2)}%` : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Vol</div>
                <div className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded">
                  {volatilityLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Loading...
                    </span>
                  ) : currentVol ? (
                    `${currentVol.toFixed(2)}%`
                  ) : (
                    "N/A"
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Expiry Date</div>
                <div className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {formatExpiry(timestamp, epoch)}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Button
                variant="link"
                className="text-sm text-gray-400 p-0 h-auto hover:text-white flex items-center"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? "Hide Details" : "Show More Details"}
                <Info className="w-3 h-3 ml-1" />
              </Button>

              {showDetails && (
                <div className="mt-3 pt-3 border-t border-[#243153] grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Start Volatility
                    </div>
                    <div className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded">
                      {startVolatility
                        ? `${startVolatility.toFixed(2)}%`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Realized Variance
                    </div>
                    <div className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded">
                      {realizedVariance
                        ? `${realizedVariance.toFixed(4)}`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Authority</div>
                    <div
                      className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded truncate"
                      title={authority}
                    >
                      {authority
                        ? `${authority.slice(0, 8)}...${authority.slice(-6)}`
                        : "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Status</div>
                    <div className="text-white text-sm font-medium bg-[#0e172a] p-2 rounded">
                      {dynamicExpired ? (
                        <span className="text-red-400 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Expired
                        </span>
                      ) : (
                        <span className="text-green-400 flex items-center">
                          <Check className="w-3 h-3 mr-1" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 bg-[#19233a] rounded-lg overflow-hidden h-12 p-0">
              <TabsTrigger
                value="mint"
                className="rounded-none data-[state=active]:bg-[#44b49c] data-[state=active]:text-white text-gray-300 h-full"
              >
                <CircleDollarSign className="w-4 h-4 mr-2" />
                Mint Tokens
              </TabsTrigger>
              <TabsTrigger
                value="positions"
                className="rounded-none data-[state=active]:bg-[#19233a] data-[state=active]:text-white text-gray-300 h-full"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                My Positions
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="mint"
              className="pt-4 animate-in fade-in-50 duration-300"
            >
              {dynamicExpired ? (
                <div className="bg-[#19233a] rounded-xl p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#0e172a] flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <h4 className="text-white font-bold mb-2 text-lg">
                    Market Has Expired
                  </h4>
                  <p className="text-gray-400 text-sm mb-5">
                    This market has expired on {formatExpiry(timestamp, epoch)}.
                    You can no longer mint new positions, but you can redeem
                    existing positions.
                  </p>
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-[#19233a] hover:bg-[#243153] text-white py-5 border border-[#243153]"
                      onClick={() => setActiveTab("positions")}
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      View Your Positions
                    </Button>
                    <Button
                      className="w-full bg-[#19233a] hover:bg-[#243153] text-white py-4 border border-[#243153]"
                      onClick={() => handleRedeem()}
                    >
                      <CircleDollarSign className="w-4 h-4 mr-2" />
                      Redeem Settlement
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#19233a] rounded-xl p-5">
                    <h4 className="text-white font-medium mb-4 flex items-center">
                      <Activity className="w-4 h-4 mr-2 text-[#44b49c]" />
                      Choose Position
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        className={`rounded-lg py-6 flex flex-col items-center justify-center ${
                          mintType === "long"
                            ? "bg-[#44b49c] text-white"
                            : "bg-[#0e172a] text-gray-300 hover:bg-[#19233a] border border-[#243153]"
                        }`}
                        onClick={() => setMintType("long")}
                      >
                        <ArrowUpRight
                          className={`h-5 w-5 mb-1 ${
                            mintType === "long"
                              ? "text-white"
                              : "text-[#44b49c]"
                          }`}
                        />
                        <span>VAR LONG</span>
                      </Button>
                      <Button
                        className={`rounded-lg py-6 flex flex-col items-center justify-center ${
                          mintType === "short"
                            ? "bg-[#B079B5] text-white"
                            : "bg-[#0e172a] text-gray-300 hover:bg-[#19233a] border border-[#243153]"
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

                  <div className="bg-[#19233a] rounded-xl p-5">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-white font-medium flex items-center">
                        <CircleDollarSign className="w-4 h-4 mr-2 text-[#44b49c]" />
                        Mint Amount
                      </h4>
                      <div className="flex items-center text-sm">
                        <span className="text-gray-400">Available:</span>
                        {connected ? (
                          isLoadingBalance ? (
                            <Loader2 className="ml-1 h-3 w-3 animate-spin text-white" />
                          ) : (
                            <span className="text-white font-medium ml-1">
                              {usdcBalance} USDC
                            </span>
                          )
                        ) : (
                          <span className="text-[#44b49c] ml-1 cursor-pointer">
                            Connect wallet
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-[#0e172a] border-[#243153] focus:border-[#44b49c] focus:ring-[#44b49c]/20 text-white px-4 py-3 h-12 rounded-lg"
                        />
                      </div>
                      <div className="bg-[#0e172a] border border-[#243153] rounded-lg h-12 px-3 flex items-center">
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-green-500"></div>
                          <span className="text-white">USDC</span>
                        </div>
                      </div>
                    </div>
                    {estimatedValue && (
                      <div className="text-xs text-gray-400 mb-1">
                        {estimatedValue}
                      </div>
                    )}
                    <div className="text-xs text-[#44b49c]">
                      Using USDC token (stablecoin on Sui network)
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="positions"
              className="pt-4 animate-in fade-in-50 slide-in-from-right-5 duration-300"
            >
              <div className="bg-[#19233a] rounded-xl p-5 mb-4">
                <h3 className="text-lg font-medium text-white mb-3 flex items-center">
                  <LayoutGrid className="w-4 h-4 mr-2 text-[#B079B5]" />
                  Your Positions
                </h3>

                {isLoadingPositions ? (
                  <div className="flex items-center justify-center space-x-2 py-5">
                    <Loader2 className="h-5 w-5 animate-spin text-[#B079B5]" />
                    <span className="text-gray-400">
                      Loading your positions...
                    </span>
                  </div>
                ) : userPositions.length > 0 ? (
                  <div className="space-y-4">
                    {userPositions.map((position, index) => (
                      <div
                        key={index}
                        className="bg-[#0e172a] rounded-xl p-4 shadow-sm"
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
                            <div className="text-gray-400 text-xs">Amount</div>
                            <div className="text-white font-medium">
                              {position.amount} tokens
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Value</div>
                            <div className="text-white font-medium">
                              {position.value}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">Minted</div>
                            <div className="text-white">
                              {position.mintDate}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs">
                              Token Used
                            </div>
                            <div className="text-white flex items-center">
                              <div className="w-3 h-3 rounded-full mr-1 bg-[#6fbcf0]"></div>
                              USDC
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#243153]">
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              className="bg-[#19233a] text-white hover:bg-[#243153] border border-[#243153]"
                              variant="outline"
                              onClick={() =>
                                window.open(
                                  `https://explorer.sui.io/object/${position.address}?network=${NETWORK}`,
                                  "_blank"
                                )
                              }
                            >
                              View on Explorer
                            </Button>

                            {dynamicExpired && (
                              <Button
                                className="bg-[#B079B5] hover:bg-[#9d6aaa] text-white"
                                onClick={() => handleRedeem()}
                              >
                                <CircleDollarSign className="w-4 h-4 mr-2" />
                                Redeem
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div className="w-12 h-12 rounded-full bg-[#0e172a] border border-[#243153] flex items-center justify-center mx-auto mb-3">
                      <Wallet className="w-6 h-6 text-gray-400" />
                    </div>
                    <h4 className="text-white font-medium mb-1">
                      No positions found
                    </h4>
                    <p className="text-gray-400 text-sm mb-4">
                      You don&apos;t have any minted tokens for this market yet.
                    </p>
                    <Button
                      className="bg-[#B079B5] hover:bg-[#9d6aaa] text-white"
                      onClick={() => setActiveTab("mint")}
                    >
                      Mint New Tokens
                    </Button>
                  </div>
                )}
              </div>

              {connected && userPositions.length === 0 && dynamicExpired && (
                <div className="bg-[#19233a] rounded-xl p-5 border-l-2 border-l-[#B079B5]">
                  <h4 className="text-white font-medium mb-2 flex items-center">
                    <CircleDollarSign className="w-4 h-4 mr-2 text-[#B079B5]" />
                    Market Settlement
                  </h4>
                  <p className="text-gray-300 text-sm mb-3">
                    This market has expired. If you previously held positions,
                    you can redeem your profit or loss.
                  </p>
                  <Button
                    className="w-full bg-[#B079B5] hover:bg-[#9d6aaa] text-white"
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

        {/* Bottom mint button - for active non-expired markets */}
        {!dynamicExpired && activeTab === "mint" && (
          <div className="mt-4 px-6 pb-6">
            {connected ? (
              <Button
                className={`w-full rounded-lg py-5 ${
                  mintType === "long"
                    ? "bg-[#44b49c] hover:bg-[#3ca28c] text-white"
                    : "bg-[#B079B5] hover:bg-[#9d6aaa] text-white"
                }`}
                onClick={handleMint}
                disabled={!amount || dynamicExpired || !connected || isMinting}
              >
                <span className="flex items-center justify-center text-lg">
                  {isMinting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Minting...
                    </>
                  ) : (
                    <>
                      Mint {mintType === "long" ? "VAR LONG" : "VAR SHORT"}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </span>
              </Button>
            ) : (
              <Button
                className="w-full rounded-lg py-5 bg-[#19233a] hover:bg-[#243153] text-white border border-[#243153]"
                onClick={() => {
                  try {
                    wallet.select("Suiet");
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to connect wallet");
                  }
                }}
              >
                <span className="flex items-center justify-center text-lg">
                  Connect Wallet to Mint
                </span>
              </Button>
            )}
          </div>
        )}
      </DialogContentWithoutCloseButton>
    </Dialog>
  );
};

export default MarketDetailsPopup;
