"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  TrendingUp,
  ArrowDownLeft,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import useSurgePerpsClient from "@/lib/useSurgePerpsClient";
import { toast } from "sonner";
import { PositionData } from "@/lib/surgePerpsUtils";
import { useVolatilityEffect } from "@/hooks/useVolatilityEffect";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction, SystemProgram } from "@solana/web3.js";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { SurgeFut } from "@/idl/surge_fut";
import futIdl from "@/idl/surge_fut.json";

// Add the necessary type for the accounts
type MintTokensAccounts = {
  user: PublicKey;
  userUsdcAccount: PublicKey;
  feeDestination: PublicKey;
  collateralPool: PublicKey;
  userTokenAccount: PublicKey;
  tokenMint: PublicKey;
  tokenConfig: PublicKey;
  userPosition: PublicKey;
  oracle: PublicKey;
  tokenProgram: PublicKey;
  systemProgram: PublicKey;
  associatedTokenProgram: PublicKey;
  rent: PublicKey;
};

const TradePanel = () => {
  const [tokenValue, setTokenValue] = useState("");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [positionData, setPositionData] = useState<PositionData | null>(null);
  const { volatility } = useVolatilityEffect();

  const { publicKey, wallet } = useWallet();
  const { fetchPositionData } = useSurgePerpsClient();

  const RPC = "https://api.devnet.solana.com";
  const connection = new Connection(RPC, "confirmed");

  // Calculate max leverage based on volatility
  // Lower volatility allows higher leverage
  const calculateMaxLeverage = () => {
    if (!volatility || volatility < 10) return 10; // Default max leverage
    // As volatility increases, max leverage decreases
    return Math.max(2, Math.min(10, Math.floor(200 / volatility)));
  };

  const maxLeverage = calculateMaxLeverage();

  // Fetch position data when component mounts or wallet changes
  useEffect(() => {
    // const loadPosition = async () => {
    //   try {
    //     setLoading(true);
    //     if (publicKey) {
    //       const data = await fetchPositionData();
    //       setPositionData(data);
    //     }
    //   } catch (err) {
    //     console.error("Error loading position data:", err);
    //     toast.error("Failed to load position data. Please try again.");
    //   } finally {
    //     setLoading(false);
    //   }
    // };
    // loadPosition();
  }, [publicKey, fetchPositionData]);

  if (!publicKey) {
    toast.error("Please connect your wallet first");
    return null;
  }

  // Create a provider with the connected wallet
  if (!wallet) {
    toast.error("Wallet adapter not found");
    setLoading(false);
    return;
  }

  const provider = new anchor.AnchorProvider(
    connection,
    wallet.adapter as unknown as anchor.Wallet,
    { preflightCommitment: "confirmed" }
  );

  // Remove unused program initialization
  anchor.setProvider(provider);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, "");
    setTokenValue(value);
  };

  const handleDirectionChange = (newDirection: "long" | "short") => {
    setDirection(newDirection);
    setIsMenuOpen(false);
  };

  const handleOpenPosition = async () => {
    try {
      if (!publicKey) {
        toast.error("Please connect your wallet first");
        return;
      }

      if (positionData?.isActive) {
        toast.error("You already have an active position");
        return;
      }

      if (!tokenValue || parseFloat(tokenValue) <= 0) {
        toast.error("Please enter a valid token amount");
        return;
      }

      setLoading(true);

      // Create program instance using SurgeFut IDL
      const programId = new PublicKey(
        "CarydvHuPVR4TZbnPQjnEbrNWXFohefCYHEoWsZMPDvZ"
      );
      const TOKEN_MINT = new PublicKey(
        "J7pvxG7z8edYNQypHpPCx8AvvEUUVkRbUrRyD9Q3pzkj"
      );
      const USDC_MINT = new PublicKey(
        "3LkNfuzBMtbfZcpd6Pn9TXD7V35FTueUP2HR1iTxf3N7"
      );
      const ORACLE_PROGRAM_ID = new PublicKey(
        "Dt3xxWhMg9RSvYyWwekqyU1jG7v7JKomMZ9seDPZU4L1"
      );

      // Get program using IDL
      const futProgram = new anchor.Program<SurgeFut>(
        futIdl as unknown as SurgeFut,
        provider
      );

      /* ---------- Derived addresses ---------- */
      const [tokenConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_config"), TOKEN_MINT.toBuffer()],
        programId
      );

      const [collateralPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("collateral_pool"), TOKEN_MINT.toBuffer()],
        programId
      );

      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_position"),
          publicKey.toBuffer(),
          TOKEN_MINT.toBuffer(),
        ],
        programId
      );

      const [oracleVolStatsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("volatility_stats")],
        ORACLE_PROGRAM_ID
      );

      /* ---------- Fetch on-chain state ---------- */
      toast.info("Fetching token configuration...");
      const tokenConfig = await futProgram.account.tokenConfig.fetch(
        tokenConfigPda
      );
      const feeDestination = tokenConfig.feeDestination as PublicKey;

      /* ---------- User token accounts ---------- */
      const userUSDC = await getAssociatedTokenAddressSync(
        USDC_MINT,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const userVVOL = await getAssociatedTokenAddressSync(
        TOKEN_MINT,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const tx = new Transaction();

      // Create USDC ATA if missing
      if (!(await connection.getAccountInfo(userUSDC))) {
        toast.info("Creating USDC token account...");
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userUSDC,
            publicKey,
            USDC_MINT,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Create vVOL ATA if missing
      if (!(await connection.getAccountInfo(userVVOL))) {
        toast.info("Creating volatility token account...");
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userVVOL,
            publicKey,
            TOKEN_MINT,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Add compute budget to handle complex transaction
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: 300000,
        })
      );

      // Convert token amount to the right format (with 6 decimals for USDC)
      const mintAmount = new anchor.BN(parseFloat(tokenValue) * 1_000_000);

      /* ---------- Build mint_tokens instruction ---------- */
      toast.info("Creating mint tokens instruction...");
      const mintIx = await futProgram.methods
        .mintTokens(mintAmount)
        .accounts({
          user: publicKey,
          userUsdcAccount: userUSDC,
          feeDestination: feeDestination,
          collateralPool: collateralPoolPda,
          userTokenAccount: userVVOL,
          tokenMint: TOKEN_MINT,
          tokenConfig: tokenConfigPda,
          userPosition: userPositionPda,
          oracle: oracleVolStatsPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        } as MintTokensAccounts)
        .instruction();

      tx.add(mintIx);

      // Add recent blockhash and fee payer
      const recentBlockhash = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = recentBlockhash.blockhash;
      tx.feePayer = publicKey;

      toast.info("Please approve the transaction in your wallet...");

      // Send transaction
      try {
        if (!wallet) {
          toast.error("Wallet adapter not found");
          setLoading(false);
          return;
        }
        const signature = await wallet.adapter.sendTransaction(tx, connection, {
          skipPreflight: false,
        });

        toast.info("Transaction sent! Waiting for confirmation...");

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash: recentBlockhash.blockhash,
            lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error("Transaction confirmed but failed");
        }

        toast.success(
          `Position opened successfully! View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`
        );

        // Fetch updated position data
        const updatedPosition = await fetchPositionData();
        setPositionData(updatedPosition);
      } catch (txError) {
        console.error("Transaction failed:", txError);
        toast.error(
          "Failed to open position: " +
            (txError instanceof Error ? txError.message : "Unknown error")
        );
      }
    } catch (err) {
      console.error("Error opening position:", err);
      toast.error(
        "Failed to open position: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  // Disable button if wallet not connected or position already exists
  const isButtonDisabled =
    !publicKey || loading || (positionData?.isActive ?? false);

  return (
    <Card className="bg-[#F5EFE0] border border-[#D9C9A8]/50 shadow-md rounded-xl text-surge-deep-green p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-bold text-surge-deep-green">Trade</h3>
        <div className="flex items-center gap-2">
          <div className="bg-white/70 rounded-lg px-3 py-1 text-xs text-surge-deep-green border border-[#D9C9A8]/50">
            {maxLeverage}x Max Leverage
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-surge-deep-green font-medium mb-2 text-sm">
            Position Type
          </p>
          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-between bg-white/70 border-[#D9C9A8]/50 text-surge-deep-green hover:bg-white hover:border-[#019E8C]/50 h-10 group transition-all duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="flex items-center">
                {direction === "long" ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4 text-[#019E8C]" />
                    <span>Long</span>
                  </>
                ) : (
                  <>
                    <ArrowDownLeft className="mr-2 h-4 w-4 text-[#E55A4B]" />
                    <span>Short</span>
                  </>
                )}
              </div>
              <ChevronDown size={16} className="text-surge-deep-green" />
            </Button>

            {isMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[#D9C9A8]/50 shadow-lg z-10">
                <button
                  className="w-full px-4 py-2 flex items-center hover:bg-[#F5EFE0] text-left transition-colors"
                  onClick={() => handleDirectionChange("long")}
                >
                  <TrendingUp className="mr-2 h-4 w-4 text-[#019E8C]" />
                  <span>Long</span>
                </button>
                <button
                  className="w-full px-4 py-2 flex items-center hover:bg-[#F5EFE0] text-left border-t border-[#D9C9A8]/30 transition-colors"
                  onClick={() => handleDirectionChange("short")}
                >
                  <ArrowDownLeft className="mr-2 h-4 w-4 text-[#E55A4B]" />
                  <span>Short</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Primary Input Field */}
        <div className="mb-6">
          <div className="flex items-center mb-2 text-surge-deep-green">
            <label className="font-medium">Number of Tokens to Mint</label>
            {direction === "long" ? (
              <span className="ml-auto text-[#019E8C] text-sm flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" /> Long
              </span>
            ) : (
              <span className="ml-auto text-red-500 text-sm flex items-center">
                <ArrowDownLeft className="mr-1 h-3 w-3" /> Short
              </span>
            )}
          </div>

          <div className="flex items-center bg-white/80 rounded-lg border border-[#D9C9A8]/50 p-2 overflow-hidden">
            <Input
              type="text"
              placeholder="0"
              value={tokenValue}
              onChange={handleTokenChange}
              className="border-0 bg-transparent text-xl font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span className="text-surge-deep-green">vVOL</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/70 border border-[#D9C9A8]/50">
          <p className="text-surge-deep-green font-medium mb-1 text-sm">
            Current Volatility
          </p>
          <p className="text-lg text-surge-deep-green font-semibold">
            {volatility ? volatility.toFixed(1) : "0.0"}%
          </p>
        </div>

        <Button
          className={`w-full h-10 text-base font-medium ${
            direction === "long"
              ? "bg-[#019E8C] hover:bg-[#018E7C] text-white"
              : "bg-[#E55A4B] hover:bg-[#D54A3B] text-white"
          } ${isButtonDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleOpenPosition}
          disabled={isButtonDisabled}
        >
          {loading ? (
            <span className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : positionData?.isActive ? (
            <span className="flex items-center">
              <AlertCircle className="mr-2 h-4 w-4" />
              Position Already Open
            </span>
          ) : (
            <>Open {direction === "long" ? "Long" : "Short"} Position</>
          )}
        </Button>
      </div>
    </Card>
  );
};

export default TradePanel;
