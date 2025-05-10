import { and, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { transactions, accounts } from "../db/schema.js";
import type { TransactionType } from "../db/schema.js";
import {
  BaseError,
  DatabaseError,
  DateRangeError,
  NotFoundError,
  ValidationError,
} from "../types/errors.js";

interface ReportParams {
  scope: "account" | "user";
  scopeId: string;
  startDate: string;
  endDate: string;
  groupBy?: string;
  currency?: string;
}

interface TransactionRow {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currency: string;
  status: string;
  type: TransactionType;
  initiatedAt: Date;
  completedAt: Date | null;
}

async function fetchTransactions(
  params: ReportParams
): Promise<TransactionRow[]> {
  try {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new DateRangeError("Invalid date format");
    }

    if (start > end) {
      throw new DateRangeError("Start date must be before end date");
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const filters = [
      gte(transactions.initiatedAt, start),
      lte(transactions.initiatedAt, end),
    ];

    if (params.currency) {
      filters.push(eq(transactions.currency, params.currency));
    }

    if (params.scope === "account") {
      filters.push(
        sql`${or(
          eq(transactions.fromAccountId, params.scopeId),
          eq(transactions.toAccountId, params.scopeId)
        )}`
      );
    } else {
      const userAccounts = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.userId, params.scopeId));

      if (!userAccounts || userAccounts.length === 0) {
        throw new NotFoundError(`No accounts found for user ${params.scopeId}`);
      }

      const accountIds = userAccounts.map((a) => a.id);
      const accountFilters = accountIds.flatMap((id) => [
        eq(transactions.fromAccountId, id),
        eq(transactions.toAccountId, id),
      ]);
      filters.push(sql`${or(...accountFilters)}`);
    }

    return await db
      .select()
      .from(transactions)
      .where(and(...filters));
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to fetch transactions: ${(error as Error).message}`
    );
  }
}

function groupTransactions(
  txs: TransactionRow[],
  groupBy: string,
  scopeId: string
) {
  if (!groupBy) return txs;

  const groups = new Map();

  const getGroupKey = (tx: TransactionRow, scopeId: string) => {
    const keys: string[] = [];

    groupBy.split(",").forEach((key) => {
      switch (key.trim()) {
        case "day":
          keys.push(tx.initiatedAt.toISOString().split("T")[0]);
          break;
        case "week":
          const dateCopy = new Date(tx.initiatedAt);
          const day = dateCopy.getDay();
          dateCopy.setDate(dateCopy.getDate() - day);
          dateCopy.setHours(0, 0, 0, 0);
          keys.push(dateCopy.toISOString().split("T")[0]);
          break;
        case "month":
          keys.push(tx.initiatedAt.toISOString().substring(0, 7)); // YYYY-MM
          break;
        case "currency":
          keys.push(tx.currency);
          break;
        case "account":
          keys.push(
            tx.fromAccountId === scopeId ? tx.toAccountId : tx.fromAccountId
          );
          break;
      }
    });

    return keys.join("|");
  };

  txs.forEach((tx) => {
    const key = getGroupKey(tx, scopeId);
    if (!groups.has(key)) {
      groups.set(key, {
        transactions: [],
        totalVolume: 0,
        transactionCount: 0,
      });
    }

    const group = groups.get(key);
    group.transactions.push(tx);
    group.totalVolume += getSignedAmount(tx, scopeId);
    group.transactionCount++;
  });

  return Array.from(groups.entries()).map(([key, group]) => {
    const dims = groupBy.split(",").map((d) => d.trim());
    const values = key.split("|");
    const result: any = {};

    dims.forEach((dim, idx) => {
      const val = values[idx];
      if (["day", "week", "month"].includes(dim)) {
        result.period = val;
      } else if (dim === "currency") {
        result.currency = val;
      } else if (dim === "account") {
        result.accountId = val;
      }
    });

    return {
      ...result,
      transactionCount: group.transactionCount,
      totalVolume: group.totalVolume,
      transactions: group.transactions,
    };
  });
}

function getSignedAmount(tx: TransactionRow, scopeId: string): number {
  if (tx.type === "TRANSFER") {
    if (tx.fromAccountId === scopeId) return -tx.amount;
    if (tx.toAccountId === scopeId) return tx.amount;
    return 0;
  }
  if (tx.type === "DEPOSIT") return tx.toAccountId === scopeId ? tx.amount : 0;
  if (tx.type === "WITHDRAWAL")
    return tx.fromAccountId === scopeId ? -tx.amount : 0;
  return 0;
}

async function getAccountBalance(
  accountId: string,
  beforeDate: Date
): Promise<number> {
  try {
    const account = await db
      .select({ balance: accounts.balance })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1);

    if (!account || account.length === 0) {
      throw new NotFoundError(`Account ${accountId} not found`);
    }

    const currentBalance = account[0].balance;

    // Get sum of transactions after the date to subtract from current balance
    const laterTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          or(
            eq(transactions.fromAccountId, accountId),
            eq(transactions.toAccountId, accountId)
          ),
          gte(transactions.initiatedAt, beforeDate)
        )
      );

    const laterSum = laterTransactions.reduce(
      (sum, tx) => sum + getSignedAmount(tx, accountId),
      0
    );

    return currentBalance - laterSum;
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to fetch account balance: ${(error as Error).message}`
    );
  }
}

async function calculateOpeningBalance(
  accountId: string,
  startDate: Date
): Promise<number> {
  return getAccountBalance(accountId, startDate);
}

async function calculateClosingBalance(
  openingBalance: number,
  transactions: TransactionRow[],
  scopeId: string
): Promise<number> {
  const transactionSum = transactions.reduce(
    (balance, tx) => balance + getSignedAmount(tx, scopeId),
    0
  );
  return openingBalance + transactionSum;
}

function calculateAverageBalance(opening: number, closing: number): number {
  return (opening + closing) / 2;
}

export async function generateTransactionBalanceReport(params: ReportParams) {
  try {
    const transactions = await fetchTransactions(params);
    const startDate = new Date(params.startDate);
    startDate.setHours(0, 0, 0, 0);

    const openingBalance = await calculateOpeningBalance(
      params.scopeId,
      startDate
    );
    const closingBalance = await calculateClosingBalance(
      openingBalance,
      transactions,
      params.scopeId
    );
    const averageBalance = calculateAverageBalance(
      openingBalance,
      closingBalance
    );

    if (!params.groupBy) {
      // Return summary report
      const totalVolume = transactions.reduce(
        (sum, tx) => sum + getSignedAmount(tx, params.scopeId),
        0
      );

      return {
        scope: params.scope,
        scopeId: params.scopeId,
        startDate: params.startDate,
        endDate: params.endDate,
        transactionCount: transactions.length,
        totalVolume,
        openingBalance,
        closingBalance,
        averageBalance,
      };
    }

    // Validate groupBy parameter
    const validGroupByOptions = ["day", "week", "month", "currency", "account"];
    const requestedGroups = params.groupBy.split(",").map((g) => g.trim());
    const invalidGroups = requestedGroups.filter(
      (g) => !validGroupByOptions.includes(g)
    );

    if (invalidGroups.length > 0) {
      throw new ValidationError(
        `Invalid groupBy options: ${invalidGroups.join(
          ", "
        )}. Valid options are: ${validGroupByOptions.join(", ")}`
      );
    }

    // Return grouped report with consistent shape
    const groupedData = groupTransactions(
      transactions,
      params.groupBy,
      params.scopeId
    );
    return {
      scope: params.scope,
      scopeId: params.scopeId,
      startDate: params.startDate,
      endDate: params.endDate,
      openingBalance,
      closingBalance,
      averageBalance,
      groups: groupedData,
    };
  } catch (error) {
    if (error instanceof BaseError) {
      throw error;
    }
    throw new DatabaseError(
      `Report generation failed: ${(error as Error).message}`
    );
  }
}
