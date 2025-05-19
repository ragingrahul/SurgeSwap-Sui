"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { XCircle } from "lucide-react";
import { useWallets, useConnectWallet } from "@mysten/dapp-kit";

interface SuiWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuiWalletModal: React.FC<SuiWalletModalProps> = ({ isOpen, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const availableWallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  // Handle closing the modal when clicking outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  // Apply the fade-in effect when the modal opens
  useEffect(() => {
    if (isOpen) {
      setFadeIn(true);
    } else {
      setFadeIn(false);
      // Reset state when modal closes
      setIsConnecting(false);
      setSelectedWallet(null);
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

  // Handle wallet connection
  const handleConnectWallet = useCallback(
    (walletName: string) => {
      const walletToConnect = availableWallets.find(
        (wallet) => wallet.name === walletName
      );
      if (walletToConnect) {
        setIsConnecting(true);
        setSelectedWallet(walletName);
        connect({ wallet: walletToConnect });

        // Add a timeout to close the modal after successful connection
        setTimeout(() => {
          onClose();
          setIsConnecting(false);
          setSelectedWallet(null);
        }, 1000);
      }
    },
    [availableWallets, connect, onClose]
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
        className="bg-[#13151C] rounded-xl shadow-lg p-5 max-w-sm w-full mx-4 transform transition-transform duration-200 wkit-modal"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Connect a wallet on Sui to continue
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="mt-6">
          <p className="text-white text-sm mb-4">Select a wallet to connect:</p>

          {availableWallets.length > 0 ? (
            <div className="space-y-3">
              {availableWallets.map((wallet) => (
                <button
                  key={wallet.name}
                  onClick={() => handleConnectWallet(wallet.name)}
                  disabled={isConnecting && selectedWallet === wallet.name}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors 
                    ${
                      isConnecting && selectedWallet === wallet.name
                        ? "bg-[#0b877a]/50 cursor-not-allowed"
                        : "bg-[#019E8C] hover:bg-[#0b877a] cursor-pointer"
                    } 
                    text-white`}
                >
                  <div className="flex items-center gap-2">
                    {wallet.icon && (
                      <img
                        src={wallet.icon}
                        alt={`${wallet.name} icon`}
                        className="w-5 h-5"
                      />
                    )}
                    <span>{wallet.name}</span>
                  </div>
                  {isConnecting && selectedWallet === wallet.name && (
                    <span className="text-sm">Connecting...</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center p-4 bg-gray-800/50 rounded-xl">
              <p className="text-gray-300 mb-2">No Sui wallets detected</p>
              <p className="text-sm text-gray-400">
                Please install a Sui wallet extension to continue
              </p>
            </div>
          )}

          <div className="text-center mt-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-sm underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SuiWalletModal;
