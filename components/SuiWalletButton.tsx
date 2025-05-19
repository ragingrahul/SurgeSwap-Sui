"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Wallet, Copy, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import SuiWalletModal from "./SuiWalletModal";

interface SuiWalletButtonProps {
  className?: string;
}

const SuiWalletButton: React.FC<SuiWalletButtonProps> = ({ className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleOpenModal = useCallback(() => {
    if (currentAccount) {
      setDropdownOpen(!dropdownOpen);
    } else {
      setIsModalOpen(true);
    }
  }, [currentAccount, dropdownOpen]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setDropdownOpen(false);
  }, [disconnect]);

  const handleCopyAddress = useCallback(() => {
    if (currentAccount) {
      navigator.clipboard.writeText(currentAccount.address);
      setDropdownOpen(false);
    }
  }, [currentAccount]);

  const handleChangeWallet = useCallback(() => {
    setIsModalOpen(true);
    setDropdownOpen(false);
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

  // Format wallet address for display
  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative">
      <Button
        className={`bg-[#019E8C] hover:bg-[#0b877a] text-white rounded-full ${className}`}
        onClick={handleOpenModal}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          <span>
            {currentAccount
              ? formatWalletAddress(currentAccount.address)
              : "Connect Wallet"}
          </span>
          {currentAccount && <ChevronDown size={16} />}
        </div>
      </Button>

      {/* Dropdown menu */}
      {dropdownOpen && currentAccount && (
        <div
          ref={dropdownRef}
          className="absolute top-full right-0 mt-2 w-48 bg-[#13151C] rounded-xl shadow-lg p-2 z-50"
        >
          <div className="p-2 text-sm text-gray-300 border-b border-gray-700">
            {formatWalletAddress(currentAccount.address)}
          </div>
          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-2 w-full p-2 text-left text-white hover:bg-[#019E8C]/20 rounded-lg transition-colors"
          >
            <Copy size={16} />
            <span>Copy Address</span>
          </button>
          <button
            onClick={handleChangeWallet}
            className="flex items-center gap-2 w-full p-2 text-left text-white hover:bg-[#019E8C]/20 rounded-lg transition-colors"
          >
            <Wallet size={16} />
            <span>Change Wallet</span>
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 w-full p-2 text-left text-white hover:bg-[#019E8C]/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Disconnect</span>
          </button>
        </div>
      )}

      <SuiWalletModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </div>
  );
};

export default SuiWalletButton;
