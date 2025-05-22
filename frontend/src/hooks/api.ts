import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  accountsApi,
  transactionsApi,
  fundingApi,
  reportsApi,
} from "@/lib/api";
import type { CreateAccountRequest } from "@/types/account";
import type { TransferRequest, FundingRequest } from "@/types/transaction";

// Accounts Hooks
export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => accountsApi.list(),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => accountsApi.getById(id),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountRequest) => accountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// Transactions Hooks
export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionsApi.list(),
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () => transactionsApi.getById(id),
  });
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransferRequest) => transactionsApi.transfer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// Funding Hooks
export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FundingRequest) => fundingApi.deposit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FundingRequest) => fundingApi.withdraw(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

// Reports Hooks
export function useAccountReport(
  accountId: string,
  params: {
    startDate: string;
    endDate: string;
    groupBy?: string;
    currency?: string;
  }
) {
  return useQuery({
    queryKey: ["reports", "account", accountId, params],
    queryFn: () => reportsApi.getAccountReport(accountId, params),
    enabled: !!accountId && !!params.startDate && !!params.endDate,
  });
}

export function useUserReport(
  userId: string,
  params: {
    startDate: string;
    endDate: string;
    groupBy?: string;
    currency?: string;
  }
) {
  return useQuery({
    queryKey: ["reports", "user", userId, params],
    queryFn: () => reportsApi.getUserReport(userId, params),
    enabled: !!userId && !!params.startDate && !!params.endDate,
  });
}
