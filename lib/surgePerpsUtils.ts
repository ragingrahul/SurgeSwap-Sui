import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idl from "@/idl/surge_perps.json";
import type { SurgePerps } from "@/idl/surge_perps";

// Constants
export const USDC_DEV = new PublicKey(
  "F2Yuf5LrH2ySTsk1M9CHkyeb9sFnXiRjWWH1Fwy1jTrv"
);
export const VAULT_TOKEN_ACCOUNT = new PublicKey(
  "CHEJa5JSSngdQFcGjvYVABxA2y3jAML4nwZ9bCMJSd9G"
);
export const VOLATILITY_STATS = new PublicKey(
  "ESgrnS6HnQEGw6cYjZMzDZrpVkr6xQ4Ls9AGTeqEgmVj"
);
export const PROGRAM_ID = new PublicKey(
  "GjMYNFqnZbAVoUoKxsYSaexT3AnXmHz1m8nMjH9Wxmdu"
);

// Position data interface
export interface PositionData {
  owner: PublicKey;
  direction: { long: object } | { short: object };
  entryVol: number;
  size: anchor.BN;
  margin: anchor.BN;
  bump: number;
  createdAt: anchor.BN;
  isActive: boolean;
}

// Wallet adapter interface for client
export interface WalletAdapter {
  publicKey: PublicKey;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signAllTransactions: any;
}

// Main utility class
export class SurgePerpsClient {
  private connection: Connection;
  private program: anchor.Program<SurgePerps>;
  private wallet: WalletAdapter; // Just use any to avoid TypeScript errors
  private provider: anchor.Provider;

  constructor(connection: Connection, wallet: WalletAdapter) {
    this.connection = connection;
    this.wallet = wallet;

    // Initialize the provider with the simplest approach
    this.provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    // Initialize the program
    this.program = new anchor.Program<SurgePerps>(
      { ...idl, address: PROGRAM_ID.toString() },
      this.provider
    );
  }

  // Get PDAs
  public getPositionPda(): PublicKey {
    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), this.wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );
    return positionPda;
  }

  public getVaultConfigPda(): PublicKey {
    const [vaultConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_config")],
      PROGRAM_ID
    );
    return vaultConfigPda;
  }

  public getSyntheticMintTokenPda(): PublicKey {
    const [syntheticMintTokenPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("synthetic_mint_token")],
      PROGRAM_ID
    );
    return syntheticMintTokenPda;
  }

  // Initialize all required accounts for the program
  public async initAccounts(): Promise<boolean> {
    try {
      console.log("Initializing all required program accounts...");

      // 1. Initialize synthetic mint if needed
      const syntheticMintPda = this.getSyntheticMintPda();
      const syntheticMintTokenPda = this.getSyntheticMintTokenPda();

      // Check if synthetic mint exists
      const syntheticMintAccount = await this.connection.getAccountInfo(
        syntheticMintPda
      );
      if (!syntheticMintAccount) {
        console.log("Initializing synthetic mint...");
        const tx = await this.program.methods
          .initSyntheticMint()
          .accounts({
            payer: this.wallet.publicKey,
            syntheticMint: syntheticMintPda,
            syntheticMintToken: syntheticMintTokenPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          .rpc();

        console.log("Synthetic mint initialized. Transaction:", tx);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Short delay
      } else {
        console.log("Synthetic mint already initialized");
      }

      // 2. Check vault config
      const vaultConfigPda = this.getVaultConfigPda();
      const vaultConfigAccount = await this.connection.getAccountInfo(
        vaultConfigPda
      );

      if (!vaultConfigAccount) {
        console.log("Initializing vault config...");
        try {
          const tx = await this.program.methods
            .setVault()
            .accounts({
              authority: this.wallet.publicKey,
              vaultConfig: vaultConfigPda,
              customVault: VAULT_TOKEN_ACCOUNT,
              systemProgram: SystemProgram.programId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
            .rpc();

          console.log("Vault config initialized. Transaction:", tx);
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Short delay
        } catch (err) {
          console.warn(
            "Error setting vault config, may already be set or require admin:",
            err
          );
          // Continue anyway, as this might require admin privileges
        }
      } else {
        console.log("Vault config already initialized");
      }

      return true;
    } catch (error) {
      console.error("Error initializing accounts:", error);
      return false;
    }
  }

  // Open a position
  public async openPosition(
    direction: "long" | "short",
    marginAmount: number
  ): Promise<string> {
    try {
      console.log(
        `Opening ${direction} position with margin: ${marginAmount} USDC`
      );

      // Convert direction to enum format
      const directionEnum = direction === "long" ? { long: {} } : { short: {} };

      // Convert margin to anchor BN with proper decimal places (USDC has 6)
      const margin = new anchor.BN(marginAmount * 1e6);

      // Get PDAs
      const positionPda = this.getPositionPda();
      const vaultConfigPda = this.getVaultConfigPda();
      const syntheticMintTokenPda = this.getSyntheticMintTokenPda();

      // Get user's ATAs
      const userUsdc = getAssociatedTokenAddressSync(
        USDC_DEV,
        this.wallet.publicKey
      );

      const userVvol = getAssociatedTokenAddressSync(
        syntheticMintTokenPda,
        this.wallet.publicKey
      );

      console.log("PDAs and accounts:");
      console.log("Position PDA:", positionPda.toString());
      console.log("User USDC:", userUsdc.toString());
      console.log("User vVOL:", userVvol.toString());

      // Create the open position transaction
      const tx = new Transaction();

      // Add high compute budget
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: 1000000,
        })
      );

      // Add very high priority fee
      tx.add(
        anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 50_000_000, // Very high priority
        })
      );

      // Create the position opening instruction
      const openPositionIx = await this.program.methods
        .openPosition(directionEnum, margin)
        .accounts({
          owner: this.wallet.publicKey,
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
          rent: SYSVAR_RENT_PUBKEY,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .instruction();

      tx.add(openPositionIx);
      tx.feePayer = this.wallet.publicKey;

      // Get recent blockhash
      const recentBlockhash = await this.connection.getLatestBlockhash(
        "confirmed"
      );
      tx.recentBlockhash = recentBlockhash.blockhash;

      // Sign and send
      console.log("Signing transaction...");
      const signedTx = await this.wallet.signTransaction(tx);

      console.log("Sending transaction...");
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: true, // Skip preflight to avoid validation errors
          preflightCommitment: "confirmed",
          maxRetries: 5,
        }
      );

      console.log("Transaction sent:", signature);

      // Wait for confirmation
      await this.connection.confirmTransaction(
        {
          signature,
          blockhash: recentBlockhash.blockhash,
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      console.log("Position opened successfully!");
      return signature;
    } catch (error) {
      console.error("Error opening position:", error);

      // Check for AccountNotInitialized error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("AccountNotInitialized") ||
        errorMessage.includes("Position account not initialized")
      ) {
        console.error("Position account not initialized.");
        throw new Error(
          "Position not initialized. Please reset your position first by clicking 'Reset Position' button."
        );
      }

      throw error;
    }
  }

  // Helper to get synthetic mint PDA
  public getSyntheticMintPda(): PublicKey {
    const [syntheticMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("synthetic_mint")],
      PROGRAM_ID
    );
    return syntheticMintPda;
  }

  // Close a position
  public async closePosition(
    checkTokenBalance: boolean = false
  ): Promise<string> {
    try {
      console.log(
        `Closing position with checkTokenBalance: ${checkTokenBalance}`
      );

      // Get PDAs
      const positionPda = this.getPositionPda();
      const vaultConfigPda = this.getVaultConfigPda();
      const syntheticMintTokenPda = this.getSyntheticMintTokenPda();

      // Get user's ATAs
      const userUsdc = getAssociatedTokenAddressSync(
        USDC_DEV,
        this.wallet.publicKey
      );

      const userVvol = getAssociatedTokenAddressSync(
        syntheticMintTokenPda,
        this.wallet.publicKey
      );

      // Check if the position exists
      const positionAccount = await this.connection.getAccountInfo(positionPda);
      if (!positionAccount) {
        console.log("Position account does not exist, nothing to close");
        throw new Error("Position does not exist");
      }

      console.log("Position account exists, proceeding to close");

      // Create a new transaction
      const tx = new Transaction();

      // Add compute budget instruction
      const computeBudget =
        anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
          units: 400000,
        });
      tx.add(computeBudget);

      // Add priority fee (may help with transaction processing)
      const priorityFee = anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000_000, // High priority for closing
      });
      tx.add(priorityFee);

      // Use the raw approach to avoid account property errors
      const closePositionIx = await this.program.methods
        .closePosition(checkTokenBalance)
        .accounts({
          owner: this.wallet.publicKey,
          userUsdc,
          vault: VAULT_TOKEN_ACCOUNT,
          position: positionPda,
          syntheticMint: syntheticMintTokenPda,
          userVvol,
          volatilityStats: VOLATILITY_STATS,
          vaultConfig: vaultConfigPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .instruction();

      tx.add(closePositionIx);
      tx.feePayer = this.wallet.publicKey;

      // Get a recent blockhash
      const recentBlockhash = await this.connection.getLatestBlockhash(
        "confirmed"
      );
      tx.recentBlockhash = recentBlockhash.blockhash;

      // Sign and send the transaction
      console.log("Signing and sending transaction...");
      const signedTx = await this.wallet.signTransaction(tx);
      const signature = await this.connection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: true,
          preflightCommitment: "confirmed",
          maxRetries: 10,
        }
      );
      console.log("Transaction sent with signature:", signature);

      // Wait for confirmation
      console.log("Waiting for confirmation...");
      await this.connection.confirmTransaction(
        {
          signature,
          blockhash: recentBlockhash.blockhash,
          lastValidBlockHeight: recentBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      console.log("Position closed successfully!");
      return signature;
    } catch (error) {
      console.error("Error closing position:", error);
      throw error;
    }
  }

  // Get position data
  public async getPositionData(): Promise<PositionData | null> {
    try {
      const positionPda = this.getPositionPda();
      const data = await this.program.account.position.fetchNullable(
        positionPda
      );
      return data as PositionData;
    } catch (error) {
      console.error("Error fetching position data:", error);
      return null;
    }
  }

  // Initialize position account directly
  public async initializePositionAccount(): Promise<string> {
    try {
      console.log("Initializing position account directly...");

      // Get position PDA
      const positionPda = this.getPositionPda();

      // Check if account already exists
      const positionAccount = await this.connection.getAccountInfo(positionPda);
      if (positionAccount) {
        console.log("Position account already exists");
        return "Position account already exists";
      }

      // Since we can't directly create a PDA with SystemProgram,
      // we'll use a workaround by opening a small position and then closing it
      console.log(
        "Initializing position account using openPosition/closePosition cycle"
      );

      // Try opening a small position to initialize the account
      try {
        // Open with minimal margin
        const signature = await this.openPosition("long", 0.1);
        console.log("Position initialized with openPosition:", signature);

        // Wait a bit for the transaction to settle
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Now close it to reset the state
        const closeSignature = await this.closePosition(true);
        console.log("Position closed after initialization:", closeSignature);

        return closeSignature;
      } catch (error) {
        console.error("Error creating position account:", error);

        // If there's an error message, make it user-friendly
        if (error instanceof Error) {
          const errorMessage = error.message;

          // Check for specific error types
          if (errorMessage.includes("AccountNotInitialized")) {
            throw new Error(
              "Could not initialize position - please try again or contact support"
            );
          } else if (errorMessage.includes("Position already active")) {
            // The position was created but perhaps not properly closed
            try {
              // Try to force close it
              const closeSignature = await this.closePosition(true);
              console.log("Force closed existing position:", closeSignature);
              return closeSignature;
            } catch (closeError) {
              console.error("Failed to force close position:", closeError);
              throw new Error(
                "Position already exists but cannot be reset. Please contact support."
              );
            }
          }
        }

        // Re-throw with context
        throw new Error(
          `Failed to initialize position: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } catch (error) {
      console.error("Error in initializePositionAccount:", error);
      throw error;
    }
  }
}
