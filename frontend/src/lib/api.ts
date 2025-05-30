import { Account, CreateAccountRequest } from "@/types/account";
import {
  Transaction,
  TransferRequest,
  FundingRequest,
} from "@/types/transaction";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://mini-instapay.local/api";

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Helper function to get common request options
const getRequestOptions = async (
  options: RequestInit = {}
): Promise<RequestInit> => {
  // Get token from our API endpoint
  const tokenResponse = await fetch("/local-api/auth/token");
  if (!tokenResponse.ok) {
    throw new AuthError("Failed to get authentication token");
  }

  const { token } = await tokenResponse.json();
  if (!token) {
    throw new AuthError("No authentication token available");
  }

  return {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
};

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    throw new AuthError("Unauthorized access");
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "An unknown error occurred" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
};

// Helper function to convert object to query string
const toQueryString = (params: Record<string, any>): string => {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
};

// Accounts API
export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/accounts`,
      options
    );
    return handleResponse(response);
  },

  create: async (data: CreateAccountRequest): Promise<Account> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/accounts/create?${toQueryString(data)}`,
      options
    );
    return handleResponse(response);
  },

  getById: async (id: string): Promise<Account> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/accounts/${id}/details`,
      options
    );
    return handleResponse(response);
  },
};

// Transactions API
export const transactionsApi = {
  list: async (): Promise<Transaction[]> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/transfers`,
      options
    );
    return handleResponse(response);
  },

  transfer: async (data: TransferRequest): Promise<Transaction> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/transfers/create?${toQueryString(data)}`,
      options
    );
    return handleResponse(response);
  },

  getById: async (id: string): Promise<Transaction> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/transfers/${id}`,
      options
    );
    return handleResponse(response);
  },

  cancel: async (id: string): Promise<void> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/transfers/${id}/cancel`,
      options
    );
    return handleResponse(response);
  },
};

// Funding API
export const fundingApi = {
  deposit: async (data: FundingRequest): Promise<Transaction> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/funding/deposit?${toQueryString(data)}`,
      options
    );
    return handleResponse(response);
  },

  withdraw: async (data: FundingRequest): Promise<Transaction> => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/transactions/v1/funding/withdraw?${toQueryString(data)}`,
      options
    );
    return handleResponse(response);
  },
};

// Reports API
export const reportsApi = {
  getAccountReport: async (
    accountId: string,
    params: {
      startDate: string;
      endDate: string;
      groupBy?: string;
      currency?: string;
    }
  ) => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/reports/accounts/${accountId}?${toQueryString(params)}`,
      options
    );
    return handleResponse(response);
  },

  getUserReport: async (
    userId: string,
    params: {
      startDate: string;
      endDate: string;
      groupBy?: string;
      currency?: string;
    }
  ) => {
    const options = await getRequestOptions();
    const response = await fetch(
      `${API_BASE_URL}/reports/users/${userId}?${toQueryString(params)}`,
      options
    );
    return handleResponse(response);
  },
};

export { AuthError };
