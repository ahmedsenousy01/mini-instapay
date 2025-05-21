"use client";

import Link from "next/link";
import { AccountList } from "@/components/AccountList";
import { TransactionList } from "@/components/TransactionList";
import { useTransactions } from "@/hooks/api";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const { data: transactions, isLoading, error } = useTransactions();

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link
          href="/accounts/new"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          New Account
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold mb-4">Your Accounts</h2>
          <AccountList />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Transactions</h2>
          {isLoading ? (
            <div className="animate-pulse">Loading transactions...</div>
          ) : error ? (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <p className="text-red-600">Failed to load transactions</p>
            </div>
          ) : (
            <TransactionList transactions={transactions ?? []} />
          )}
        </div>
      </div>
    </main>
  );
}
