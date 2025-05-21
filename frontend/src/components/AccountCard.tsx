import { Account } from "@/types/account";
import { Card, CardContent, CardHeader } from "./ui/card";

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">{account.currency} Account</h3>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Balance</span>
          <span className="text-xl font-bold">
            {account.balance.toLocaleString(undefined, {
              style: "currency",
              currency: account.currency,
            })}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          ID: {account.id.slice(0, 8)}...
        </div>
      </CardContent>
    </Card>
  );
}
