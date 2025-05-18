"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet, LogOut, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomWalletModal from "./CustomWalletModal";
import { motion, AnimatePresence } from "framer-motion";

interface CustomWalletButtonProps {
  className?: string;
}

const CustomWalletButton: React.FC<CustomWalletButtonProps> = ({
  className,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { connected, publicKey, disconnect } = useWallet();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setDropdownOpen(false);
  }, [disconnect]);

  const handleCopyAddress = useCallback(() => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
    }
    setDropdownOpen(false);
  }, [publicKey]);

  // Format wallet address for display
  const formatWalletAddress = useCallback((address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {connected ? (
        <div className="relative" ref={dropdownRef}>
          <Button
            className={`bg-[#019E8C] hover:bg-[#0b877a] text-white rounded-full ${className}`}
            onClick={toggleDropdown}
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>
                {publicKey && formatWalletAddress(publicKey.toString())}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </Button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-48 bg-[#13151C] rounded-xl shadow-lg overflow-hidden z-50"
              >
                <div className="py-1">
                  <button
                    onClick={handleCopyAddress}
                    className="w-full px-4 py-3 text-left flex items-center gap-2 text-white hover:bg-[#019E8C] transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy address</span>
                  </button>

                  <button
                    onClick={openModal}
                    className="w-full px-4 py-3 text-left flex items-center gap-2 text-white hover:bg-[#019E8C] transition-colors"
                  >
                    <Wallet className="h-4 w-4" />
                    <span>Change wallet</span>
                  </button>

                  <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-3 text-left flex items-center gap-2 text-white hover:bg-red-500 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Button
          className={`bg-[#019E8C] hover:bg-[#0b877a] text-white rounded-full ${className}`}
          onClick={openModal}
        >
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span>Connect Wallet</span>
          </div>
        </Button>
      )}

      <CustomWalletModal isOpen={isModalOpen} onClose={closeModal} />
    </>
  );
};

export default CustomWalletButton;
