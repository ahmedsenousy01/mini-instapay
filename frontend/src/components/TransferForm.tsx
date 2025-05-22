"use client";

import { useState } from "react";
import { useTransfer } from "@/hooks/api";
import type { Account } from "@/types/account";

interface TransferFormProps {
  fromAccount: Account;
  onSuccess?: () => void;
}

export function TransferForm({ fromAccount, onSuccess }: TransferFormProps) {
  const [amount, setAmount] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const transfer = useTransfer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await transfer.mutateAsync({
        fromAccountId: fromAccount.id,
        toAccountId,
        amount: parseFloat(amount),
        currency: fromAccount.currency,
      });

      setAmount("");
      setToAccountId("");
      onSuccess?.();
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="toAccountId"
          className="block text-sm font-medium text-gray-700"
        >
          Recipient Account ID
        </label>
        <input
          type="text"
          id="toAccountId"
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter recipient's account ID"
        />
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Amount ({fromAccount.currency})
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0.01"
          step="0.01"
          className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder={`Enter amount in ${fromAccount.currency}`}
        />
      </div>

      <button
        type="submit"
        disabled={transfer.isPending}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {transfer.isPending ? "Processing..." : "Transfer"}
      </button>

      {transfer.error && (
        <div className="text-red-600 text-sm">
          Transfer failed. Please try again.
        </div>
      )}
    </form>
  );
}
