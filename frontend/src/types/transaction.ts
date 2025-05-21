export type TransactionType = "TRANSFER" | "DEPOSIT" | "WITHDRAWAL";
export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface Transaction {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  initiatedAt: string;
  completedAt: string | null;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
}

export interface FundingRequest {
  accountId: string;
  amount: number;
  currency: string;
}
