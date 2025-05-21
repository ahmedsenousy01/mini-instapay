import { Account, CreateAccountRequest } from "@/types/account";
import {
  Transaction,
  TransferRequest,
  FundingRequest,
} from "@/types/transaction";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:30080/api";

// Accounts API
export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const response = await fetch(`${API_BASE_URL}/transactions/v1/accounts`, {
      credentials: "include",
    });
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to fetch accounts");
    }
    return response.json();
  },

  create: async (data: CreateAccountRequest): Promise<Account> => {
    const response = await fetch(`${API_BASE_URL}/transactions/v1/accounts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to create account");
    }
    return response.json();
  },

  getById: async (id: string): Promise<Account> => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/accounts/${id}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to fetch account");
    }
    return response.json();
  },
};

// Transactions API
export const transactionsApi = {
  list: async (): Promise<Transaction[]> => {
    const response = await fetch(`${API_BASE_URL}/transactions/v1/transfers`, {
      credentials: "include",
    });
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to fetch transactions");
    }
    return response.json();
  },

  transfer: async (data: TransferRequest): Promise<Transaction> => {
    const response = await fetch(`${API_BASE_URL}/transactions/v1/transfers`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to create transfer");
    }
    return response.json();
  },

  getById: async (id: string): Promise<Transaction> => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/transfers/${id}`,
      {
        credentials: "include",
      }
    );
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to fetch transaction");
    }
    return response.json();
  },
};

// Funding API
export const fundingApi = {
  deposit: async (data: FundingRequest): Promise<Transaction> => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/funding/deposit`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to deposit funds");
    }
    return response.json();
  },

  withdraw: async (data: FundingRequest): Promise<Transaction> => {
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/funding/withdraw`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) {
      console.log(response.status);
      console.log(response);
      throw new Error("Failed to withdraw funds");
    }
    return response.json();
  },
};
