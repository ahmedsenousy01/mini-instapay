"use client";

import { useState } from "react";
import { useDeposit, useWithdraw } from "@/hooks/api";
import type { Account } from "@/types/account";

interface FundingFormProps {
  account: Account;
  onSuccess?: () => void;
}

export function FundingForm({ account, onSuccess }: FundingFormProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const deposit = useDeposit();
  const withdraw = useWithdraw();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        accountId: account.id,
        amount: parseFloat(amount),
        currency: account.currency,
      };

      if (type === "deposit") {
        await deposit.mutateAsync(data);
      } else {
        await withdraw.mutateAsync(data);
      }

      setAmount("");
      onSuccess?.();
    } catch (error) {
      console.error("Operation failed:", error);
    }
  };

  const isPending = deposit.isPending || withdraw.isPending;
  const error = deposit.error || withdraw.error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Operation Type
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("deposit")}
            className={`py-2 px-4 text-sm font-medium rounded-md ${
              type === "deposit"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setType("withdraw")}
            className={`py-2 px-4 text-sm font-medium rounded-md ${
              type === "withdraw"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Amount ({account.currency})
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
          placeholder={`Enter amount in ${account.currency}`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending
          ? "Processing..."
          : type === "deposit"
          ? "Deposit"
          : "Withdraw"}
      </button>

      {error && (
        <div className="text-red-600 text-sm">
          Operation failed. Please try again.
        </div>
      )}
    </form>
  );
}
