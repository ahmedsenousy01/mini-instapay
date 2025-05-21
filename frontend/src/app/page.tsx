import { Suspense } from "react";
import Link from "next/link";
import { AccountList } from "@/components/AccountList";
import { TransactionList } from "@/components/TransactionList";
import { transactionsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

async function RecentTransactions() {
  try {
    const transactions = await transactionsApi.list();
    return <TransactionList transactions={transactions} />;
  } catch (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600">Failed to load transactions</p>
      </div>
    );
  }
}

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="container mx-auto py-10 px-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">
                Your Accounts
              </h2>
              <Link
                href="/accounts/new"
                className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors duration-200 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Link>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <AccountList />
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-gray-800">
                Recent Transactions
              </h2>
              <Link
                href="/transactions/new"
                className="bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition-colors duration-200 shadow-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Link>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <ErrorBoundary>
                <Suspense fallback={<div>Loading transactions...</div>}>
                  <RecentTransactions />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
