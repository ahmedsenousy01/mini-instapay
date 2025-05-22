"use client";

import { useState } from "react";
import { useAccountReport, useUserReport } from "@/hooks/api";
import type { Account } from "@/types/account";

interface ReportFormProps {
  account: Account;
  userId: string;
}

export function ReportForm({ account, userId }: ReportFormProps) {
  const [reportType, setReportType] = useState<"account" | "user">("account");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [groupBy, setGroupBy] = useState<"day" | "month">("day");

  const accountReport = useAccountReport(account.id, {
    startDate,
    endDate,
    groupBy,
    currency: account.currency,
  });

  const userReport = useUserReport(userId, {
    startDate,
    endDate,
    groupBy,
    currency: account.currency,
  });

  const report = reportType === "account" ? accountReport : userReport;
  const isLoading = report.isLoading;
  const error = report.error;
  const data = report.data;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Report Type
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setReportType("account")}
              className={`py-2 px-4 text-sm font-medium rounded-md ${
                reportType === "account"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              Account Report
            </button>
            <button
              type="button"
              onClick={() => setReportType("user")}
              className={`py-2 px-4 text-sm font-medium rounded-md ${
                reportType === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              User Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Group By
          </label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGroupBy("day")}
              className={`py-2 px-4 text-sm font-medium rounded-md ${
                groupBy === "day"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("month")}
              className={`py-2 px-4 text-sm font-medium rounded-md ${
                groupBy === "month"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse text-center py-8">Loading report...</div>
      ) : error ? (
        <div className="text-red-600 text-sm text-center py-8">
          Failed to load report. Please try again.
        </div>
      ) : data ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900">
              {reportType === "account" ? "Account Report" : "User Report"}
            </h3>
            <div className="mt-4 space-y-4">
              <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
