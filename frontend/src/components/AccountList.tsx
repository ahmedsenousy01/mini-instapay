"use client";

import { accountsApi } from "@/lib/api";
import { AccountCard } from "./AccountCard";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

export function AccountList() {
  const router = useRouter();
  const {
    data: accounts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });

  if (isLoading) {
    return (
      <div className="text-center p-4">
        <div className="animate-pulse">Loading accounts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600">Failed to load accounts</p>
      </div>
    );
  }

  if (!accounts?.length) {
    return (
      <div className="text-center p-8 border rounded-lg bg-gray-50">
        <p className="text-gray-600">No accounts found.</p>
        <p className="text-sm text-gray-500 mt-2">
          Create a new account to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onClick={() => router.push(`/accounts/${account.id}`)}
        />
      ))}
    </div>
  );
}
