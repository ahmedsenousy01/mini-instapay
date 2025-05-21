"use client";

import { useRouter } from "next/navigation";
import { accountsApi } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateAccountRequest } from "@/types/account";

export default function NewAccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation({
    mutationFn: (data: CreateAccountRequest) => accountsApi.create(data),
    onSuccess: () => {
      // Invalidate the accounts list query to refetch it
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      router.push("/");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const currency = formData.get("currency") as string;

    if (!currency) return;

    mutate({ currency });
  }

  return (
    <main className="container mx-auto py-8 px-4 max-w-md">
      <h1 className="text-3xl font-bold mb-8">Create New Account</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="currency"
            className="block text-sm font-medium text-gray-700"
          >
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            required
            disabled={isPending}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a currency</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
            <option value="JPY">JPY - Japanese Yen</option>
          </select>
        </div>

        {error && (
          <div className="text-red-600 text-sm">
            Failed to create account. Please try again.
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Creating..." : "Create Account"}
        </button>
      </form>
    </main>
  );
}
