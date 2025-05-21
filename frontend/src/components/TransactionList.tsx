import { Transaction } from "@/types/transaction";

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="space-y-4">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="p-4 border rounded-lg hover:bg-gray-50"
        >
          <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold">{transaction.type}</span>
              <span className="ml-2 text-sm text-gray-500">
                {new Date(transaction.initiatedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="text-right">
              <div className="font-bold">
                {transaction.amount.toLocaleString(undefined, {
                  style: "currency",
                  currency: transaction.currency,
                })}
              </div>
              <div className="text-sm text-gray-500">{transaction.status}</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <div>From: {transaction.fromAccountId.slice(0, 8)}...</div>
            <div>To: {transaction.toAccountId.slice(0, 8)}...</div>
          </div>
        </div>
      ))}
    </div>
  );
}
