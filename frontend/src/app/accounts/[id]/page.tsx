"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { TransactionList } from "@/components/TransactionList";
import { TransferForm } from "@/components/TransferForm";
import { FundingForm } from "@/components/FundingForm";
import { ReportForm } from "@/components/ReportForm";
import { useAccount, useTransactions } from "@/hooks/api";
import { useEffect, useState } from "react";

interface AccountPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AccountPage({ params }: AccountPageProps) {
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Resolve the params promise to get the account ID
    params.then(({ id }) => setAccountId(id));
  }, [params]);

  // Don't fetch data until we have the account ID
  const {
    data: account,
    isLoading: isLoadingAccount,
    error: accountError,
  } = useAccount(accountId ?? "");
  const { data: transactions, isLoading: isLoadingTransactions } =
    useTransactions();

  // Show loading state while resolving params or loading data
  if (!accountId || isLoadingAccount || isLoadingTransactions) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="animate-pulse">Loading...</div>
      </main>
    );
  }

  if (accountError || !account) {
    return notFound();
  }

  // Filter transactions for this account
  const accountTransactions =
    transactions?.filter(
      (tx) => tx.fromAccountId === account.id || tx.toAccountId === account.id
    ) ?? [];

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link
          href="/"
          className="text-blue-500 hover:text-blue-600 mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">{account.currency} Account</h1>
        <div className="mt-4 p-6 bg-white rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Balance</p>
              <p className="text-2xl font-bold">
                {account.balance.toLocaleString(undefined, {
                  style: "currency",
                  currency: account.currency,
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Account ID</p>
              <p className="font-mono text-sm">{account.id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">Transfer Money</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <TransferForm fromAccount={account} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Deposit / Withdraw</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <FundingForm account={account} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Reports</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <ReportForm account={account} userId={account.userId} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Transactions</h2>
          <TransactionList transactions={accountTransactions} />
        </div>
      </div>
    </main>
  );
}
