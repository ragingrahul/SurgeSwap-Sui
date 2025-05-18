"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useWallet, Wallet } from "@solana/wallet-adapter-react";
import { WalletName, WalletReadyState } from "@solana/wallet-adapter-base";
import { XCircle } from "lucide-react";

interface CustomWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomWalletModal: React.FC<CustomWalletModalProps> = ({
  isOpen,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { wallets, select, connecting, connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Handle closing the modal when clicking outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
        setSelectedWallet(null);
        setIsSelecting(false);
      }
    },
    [onClose]
  );

  // Connect to the selected wallet
  const handleWalletClick = useCallback(
    (wallet: Wallet) => {
      setSelectedWallet(wallet);
      setIsSelecting(true);

      // Select the wallet - errors will be handled by the WalletProvider's onError handler
      select(wallet.adapter.name as WalletName);

      // Close modal only if connection is already established
      if (connected) {
        onClose();
        setSelectedWallet(null);
        setIsSelecting(false);
      }
    },
    [select, onClose, connected]
  );

  // Monitor connection status and close modal when connected
  useEffect(() => {
    if (connected && selectedWallet) {
      onClose();
      setSelectedWallet(null);
      setIsSelecting(false);
    }
  }, [connected, selectedWallet, onClose]);

  // Detect if a wallet connection attempt has timed out or been cancelled
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isSelecting && selectedWallet) {
      // If still in selecting state after 30 seconds, reset the state
      // but don't show any error message
      timeoutId = setTimeout(() => {
        setIsSelecting(false);
        setSelectedWallet(null);
      }, 30000); // 30 seconds timeout
    }

    // If not connecting anymore, and we were in selecting state, reset state
    if (!connecting && isSelecting) {
      setIsSelecting(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connecting, isSelecting, selectedWallet]);

  // Apply the fade-in effect when the modal opens
  useEffect(() => {
    if (isOpen) {
      setFadeIn(true);
    } else {
      setFadeIn(false);
      // Reset states when modal closes
      setSelectedWallet(null);
      setIsSelecting(false);
    }
  }, [isOpen]);

  // Add click handler for closing when clicking outside
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent scrolling when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, handleClickOutside]);

  // Handle client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter out wallets that are not installed or unsupported
  const installableWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) =>
          wallet.readyState === WalletReadyState.Installed ||
          wallet.readyState === WalletReadyState.Loadable
      ),
    [wallets]
  );

  // Only render on client-side
  if (!mounted || !isOpen) return null;

  // Use createPortal to render the modal at the document root
  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
        fadeIn ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        ref={ref}
        className="bg-[#13151C] rounded-xl shadow-lg p-5 max-w-sm w-full mx-4 transform transition-transform duration-200"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Connect a wallet on Solana to continue
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="space-y-3 mt-5">
          {installableWallets.length > 0 ? (
            installableWallets.map((wallet) => (
              <button
                key={wallet.adapter.name}
                onClick={() => handleWalletClick(wallet)}
                disabled={
                  isSelecting &&
                  selectedWallet?.adapter.name === wallet.adapter.name
                }
                className={`w-full py-3 px-4 rounded-xl transition-colors text-white flex items-center justify-between
                  ${
                    isSelecting &&
                    selectedWallet?.adapter.name === wallet.adapter.name
                      ? "bg-[#2AA18C]/70 cursor-not-allowed"
                      : "bg-[#4BB39A] hover:bg-[#2AA18C] cursor-pointer"
                  }`}
              >
                <div className="flex items-center gap-2">
                  {wallet.adapter.icon && (
                    <img
                      src={wallet.adapter.icon}
                      alt={`${wallet.adapter.name} icon`}
                      className="w-6 h-6 rounded-full"
                    />
                  )}
                  <span>
                    {wallet.adapter.name}
                    {isSelecting &&
                      selectedWallet?.adapter.name === wallet.adapter.name &&
                      " (Connecting...)"}
                  </span>
                </div>
                <span className="text-gray-200">Detected</span>
              </button>
            ))
          ) : (
            <p className="text-gray-300 text-center">
              No wallets found. Please install a Solana wallet extension.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CustomWalletModal;
