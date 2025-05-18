"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { SurgeFut } from "@/idl/surge_fut";
import futIdl from "@/idl/surge_fut.json";
import { toast } from "sonner";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Constants
const RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  "CarydvHuPVR4TZbnPQjnEbrNWXFohefCYHEoWsZMPDvZ"
);
const TOKEN_MINT = new PublicKey(
  "J7pvxG7z8edYNQypHpPCx8AvvEUUVkRbUrRyD9Q3pzkj"
);

// Match the actual structure from the SurgeFut IDL
type UserPositionData = {
  owner: PublicKey;
  entryVolatility: number;
  tokensMinted: number;
  usdcCollateral: number;
  mintTimestamp: anchor.BN | null;
  bump: number;
  isActive: boolean; // We'll derive this based on tokensMinted > 0
};

// Create a solid background style using const assertions
const solidBgStyle = {
  backgroundColor: "#F5EFE0",
  boxShadow:
    "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  position: "relative",
  zIndex: 10,
} as const;

const whiteBgStyle = {
  backgroundColor: "white",
  position: "relative",
  zIndex: 10,
} as const;

// Type for transaction error
type TransactionError = {
  logs?: string[];
  message?: string;
};

// Type for redeem_tokens accounts
type RedeemTokensAccounts = {
  user: PublicKey;
  userUsdcAccount: PublicKey;
  userTokenAccount: PublicKey;
  feeDestination: PublicKey;
  collateralPool: PublicKey;
  tokenMint: PublicKey;
  tokenConfig: PublicKey;
  userPosition: PublicKey;
  oracle: PublicKey;
  tokenProgram: PublicKey;
  systemProgram: PublicKey;
};

const ActivePositionPanel = () => {
  const { publicKey, wallet } = useWallet();
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<UserPositionData | null>(
    null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh data
  const refreshData = () => setRefreshTrigger((prev) => prev + 1);

  useEffect(() => {
    const fetchPositionData = async () => {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const connection = new Connection(RPC, "confirmed");

        // Get PDAs
        const [userPositionPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("user_position"),
            publicKey.toBuffer(),
            TOKEN_MINT.toBuffer(),
          ],
          PROGRAM_ID
        );

        // Fetch user position data only, skip balance info
        if (wallet) {
          const provider = new anchor.AnchorProvider(
            connection,
            wallet.adapter as unknown as anchor.Wallet,
            { preflightCommitment: "confirmed" }
          );

          const program = new anchor.Program<SurgeFut>(
            futIdl as unknown as SurgeFut,
            provider
          );

          try {
            const posData = await program.account.userPosition.fetch(
              userPositionPda
            );
            console.log(
              "Raw volatility value from chain:",
              posData.entryVolatility
            );

            // Try different scale factor approaches
            const volatilityAsIs = Number(posData.entryVolatility);
            const volatilityTimes100 = Number(posData.entryVolatility) * 100;

            console.log("Volatility as-is:", volatilityAsIs);
            console.log("Volatility times 100:", volatilityTimes100);

            // If the expected value is 11.6% but we're seeing a much smaller number,
            // it's likely stored as a decimal (0.116) rather than percentage (11.6)
            let volatilityValue = volatilityAsIs;

            // If volatility is less than 1 but we expect percentage values (like 11.6%),
            // then it's likely stored as a decimal and we need to multiply by 100
            if (volatilityAsIs < 1 && volatilityAsIs > 0) {
              console.log(
                "Volatility appears to be stored as decimal, multiplying by 100"
              );
              volatilityValue = volatilityTimes100;
            }

            setUserPosition({
              owner: posData.owner,
              entryVolatility: volatilityValue,
              tokensMinted: posData.tokensMinted
                ? Number(posData.tokensMinted) / 1e6
                : 0,
              usdcCollateral: posData.usdcCollateral
                ? Number(posData.usdcCollateral) / 1e6
                : 0,
              mintTimestamp: posData.mintTimestamp,
              bump: posData.bump,
              isActive: posData.tokensMinted
                ? Number(posData.tokensMinted) > 0
                : false,
            });
          } catch (error) {
            console.log("No position data found or error:", error);
            setUserPosition(null);
          }
        }
      } catch (error) {
        console.error("Error fetching position data:", error);
        toast.error("Failed to fetch position data");
      } finally {
        setLoading(false);
      }
    };

    fetchPositionData();
  }, [publicKey, wallet, refreshTrigger]);

  const handleClosePosition = async () => {
    try {
      if (!publicKey || !wallet || !userPosition) {
        toast.error("Wallet not connected or no active position");
        return;
      }

      // Log the position data for debugging
      console.log("User position data before closing:", userPosition);

      // Check if the user has tokens to redeem
      if (userPosition.tokensMinted <= 0) {
        toast.error("No tokens to redeem. Position may already be closed.");
        return;
      }

      setLoading(true);
      toast.info("Closing position...");

      const connection = new Connection(RPC, "confirmed");

      // Create provider with the connected wallet
      const provider = new anchor.AnchorProvider(
        connection,
        wallet.adapter as unknown as anchor.Wallet,
        { preflightCommitment: "confirmed" }
      );

      // Get program using IDL
      const program = new anchor.Program<SurgeFut>(
        futIdl as unknown as SurgeFut,
        provider
      );

      /* ---- Derive PDAs ---- */
      const [tokenConfigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_config"), TOKEN_MINT.toBuffer()],
        PROGRAM_ID
      );

      const [collateralPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("collateral_pool"), TOKEN_MINT.toBuffer()],
        PROGRAM_ID
      );

      const [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user_position"),
          publicKey.toBuffer(),
          TOKEN_MINT.toBuffer(),
        ],
        PROGRAM_ID
      );

      const [oracleVolStatsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("volatility_stats")],
        new PublicKey("Dt3xxWhMg9RSvYyWwekqyU1jG7v7JKomMZ9seDPZU4L1")
      );

      /* ---- Fetch tokenConfig to read the fee destination ---- */
      const tokenConfig = await program.account.tokenConfig.fetch(
        tokenConfigPda
      );
      const feeDestination = tokenConfig.feeDestination as PublicKey;

      /* ---- User token accounts ---- */
      const USDC_MINT = new PublicKey(
        "3LkNfuzBMtbfZcpd6Pn9TXD7V35FTueUP2HR1iTxf3N7"
      );

      const userVVOL = await anchor.utils.token.associatedAddress({
        mint: TOKEN_MINT,
        owner: publicKey,
      });

      const userUSDC = await anchor.utils.token.associatedAddress({
        mint: USDC_MINT,
        owner: publicKey,
      });

      // Convert the tokensMinted to the raw amount (with 6 decimals)
      // If user has 2 vVOL, that's 2_000_000 in raw units
      const redeemAmount = new anchor.BN(
        Math.floor(userPosition.tokensMinted * 1_000_000)
      );

      console.log("Redeeming amount:", redeemAmount.toString());
      console.log("User vVOL ATA:", userVVOL.toBase58());
      console.log("User USDC ATA:", userUSDC.toBase58());
      console.log("Collateral Pool:", collateralPoolPda.toBase58());
      console.log("Token Config:", tokenConfigPda.toBase58());
      console.log("User Position PDA:", userPositionPda.toBase58());
      console.log("Oracle PDA:", oracleVolStatsPda.toBase58());

      const tx = new anchor.web3.Transaction();

      /* ---- Build redeemTokens instruction ---- */
      const redeemIx = await program.methods
        .redeemTokens(redeemAmount)
        .accounts({
          user: publicKey,
          userUsdcAccount: userUSDC,
          userTokenAccount: userVVOL,
          feeDestination: feeDestination,
          collateralPool: collateralPoolPda,
          tokenMint: TOKEN_MINT,
          tokenConfig: tokenConfigPda,
          userPosition: userPositionPda,
          oracle: oracleVolStatsPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as RedeemTokensAccounts)
        .instruction();

      tx.add(redeemIx);

      // Add recent blockhash and fee payer
      const recentBlockhash = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = recentBlockhash.blockhash;
      tx.feePayer = publicKey;

      // Send transaction
      try {
        toast.info("Please approve the transaction in your wallet...");
        const signature = await wallet.adapter.sendTransaction(tx, connection, {
          skipPreflight: false,
        });

        console.log("Transaction sent:", signature);
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
          `Position closed successfully! View on explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`
        );
        console.log("✅ redeemTokens tx:", signature);
        console.log("👉 Collateral pool:", collateralPoolPda.toBase58());
        console.log("👉 User vVOL ATA:", userVVOL.toBase58());
        console.log("👉 User USDC ATA:", userUSDC.toBase58());

        // Refresh position data
        refreshData();
      } catch (txError) {
        console.error("Transaction failed:", txError);

        // If there are transaction logs, display them for debugging
        const transactionError = txError as TransactionError;
        if (transactionError.logs) {
          console.error(
            "\nTransaction logs:\n" + transactionError.logs.join("\n")
          );
        }

        toast.error(
          "Failed to close position: " +
            (txError instanceof Error ? txError.message : "Unknown error")
        );
      }
    } catch (err) {
      console.error("Error closing position:", err);
      toast.error(
        "Failed to close position: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div
        className="rounded-xl border border-[#D9C9A8] p-6 text-surge-deep-green"
        style={solidBgStyle}
      >
        <h3 className="text-xl font-bold text-surge-deep-green mb-4">
          Position
        </h3>
        <p className="text-center py-8">
          Connect your wallet to view positions
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[#D9C9A8] p-6 text-surge-deep-green"
      style={solidBgStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-surge-deep-green">Position</h3>
        <button
          onClick={refreshData}
          className="text-xs px-3 py-1 bg-white rounded-md hover:bg-gray-50 text-surge-deep-green border border-[#D9C9A8]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-[#019E8C] border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Position */}
          <div>
            <h4 className="font-semibold text-sm mb-2 text-[#019E8C]">
              {userPosition?.isActive
                ? "Active Position"
                : "No Active Position"}
            </h4>
            {userPosition?.isActive && (
              <div
                className="p-3 rounded-lg border border-[#D9C9A8] text-surge-deep-green"
                style={whiteBgStyle}
              >
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-surge-deep-green">Collateral:</div>
                  <div className="font-medium text-right">
                    {userPosition.usdcCollateral} USDC
                  </div>

                  <div className="text-surge-deep-green">Tokens Minted:</div>
                  <div className="font-medium text-right">
                    {userPosition.tokensMinted} vVOL
                  </div>

                  <div className="text-surge-deep-green">Entry Volatility:</div>
                  <div className="font-medium text-right">
                    {userPosition.entryVolatility.toFixed(1)}%
                  </div>

                  {userPosition.mintTimestamp && (
                    <>
                      <div className="text-surge-deep-green">Entry Time:</div>
                      <div className="font-medium text-right">
                        {new Date(
                          Number(userPosition.mintTimestamp) * 1000
                        ).toLocaleString()}
                      </div>
                    </>
                  )}

                  <div className="col-span-2 mt-2">
                    <button
                      onClick={handleClosePosition}
                      disabled={loading || !userPosition.isActive}
                      className="w-full bg-white hover:bg-red-50 border border-red-300 text-red-600 py-1 px-2 rounded text-xs mt-2 transition-colors"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-600"
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
                      ) : (
                        "Close Position"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {!userPosition?.isActive && (
              <div
                className="p-6 rounded-lg border border-[#D9C9A8] text-center"
                style={whiteBgStyle}
              >
                <p className="text-surge-deep-green">
                  No active position. Open a position to start trading.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivePositionPanel;
