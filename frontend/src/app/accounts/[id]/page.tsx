import { notFound } from "next/navigation";
import { accountsApi, transactionsApi } from "@/lib/api";
import { TransactionList } from "@/components/TransactionList";
import Link from "next/link";

interface AccountPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  try {
    const { id } = await params;
    const [account, transactions] = await Promise.all([
      accountsApi.getById(id),
      transactionsApi.list(),
    ]);

    // Filter transactions for this account
    const accountTransactions = transactions.filter(
      (tx) => tx.fromAccountId === account.id || tx.toAccountId === account.id
    );

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">
              Account Transactions
            </h2>
            <TransactionList transactions={accountTransactions} />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <Link
                href={`/accounts/${account.id}/deposit`}
                className="block w-full text-center bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Deposit Funds
              </Link>
              <Link
                href={`/accounts/${account.id}/withdraw`}
                className="block w-full text-center bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
              >
                Withdraw Funds
              </Link>
              <Link
                href={`/accounts/${account.id}/transfer`}
                className="block w-full text-center bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Transfer Money
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  } catch (error) {
    console.error(error);
    notFound();
  }
}
