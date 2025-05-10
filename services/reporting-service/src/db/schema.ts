import { index, pgTable } from "drizzle-orm/pg-core";
import {
  uuid,
  char,
  timestamp,
  varchar,
  text,
  boolean,
  real,
} from "drizzle-orm/pg-core";

// Define transaction types as string literals
export type TransactionType = "TRANSFER" | "DEPOSIT" | "WITHDRAWAL";
export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  currency: char("currency", { length: 3 }).notNull(),
  balance: real("balance").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromAccountId: uuid("from_account_id")
      .references(() => accounts.id)
      .notNull(),
    toAccountId: uuid("to_account_id")
      .references(() => accounts.id)
      .notNull(),
    amount: real("amount").notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    status: varchar("status", { length: 20 })
      .$type<TransactionStatus>()
      .notNull(),
    type: varchar("type", { length: 20 }).$type<TransactionType>().notNull(),
    initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("from_account_id_idx").on(table.fromAccountId),
    index("to_account_id_idx").on(table.toAccountId),
  ]
);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
