import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { useWallet } from "@suiet/wallet-kit";

export function useTransactionExecution() {
  const wallet = useWallet();

  const executeTransaction = async (txb: Transaction) => {
    try {
      // Check if wallet is connected
      if (!wallet.connected) {
        throw new Error("[KIT.UNKNOWN_ERROR] Wallet not connected");
      }

      console.log("Signing and executing transaction with wallet...");
      const response = await wallet.signAndExecuteTransactionBlock({
        transactionBlock: txb as unknown as Parameters<
          typeof wallet.signAndExecuteTransactionBlock
        >[0]["transactionBlock"],
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log("Transaction executed:", response);
      toast.success("Successfully executed transaction!");
      return response;
    } catch (error) {
      console.error("Transaction execution error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to execute transaction: ${errorMessage}`);
      throw error;
    }
  };

  return executeTransaction;
}
