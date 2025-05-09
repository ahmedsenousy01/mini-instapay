# Mini-InstaPay Database Schema

This file presents a high-level relational schema for Mini-InstaPay: **Payment Database** for account balances, transactions and notifications.

---

## Payment Database

### Table: accounts

| Column     | Type          | Notes                         |
| ---------- | ------------- | ----------------------------- |
| id         | UUID          | Primary key                   |
| user_id    | UUID          | References AuthDB.users.id    |
| currency   | CHAR(3)       | Currency code (e.g., USD)     |
| balance    | NUMERIC(18,2) | Current account balance       |
| created_at | TIMESTAMP     | Timestamp of account creation |

### Table: transactions

| Column          | Type          | Notes                                     |
| --------------- | ------------- | ----------------------------------------- |
| id              | UUID          | Primary key                               |
| from_account_id | UUID          | References PaymentDB.accounts.id          |
| to_account_id   | UUID          | References PaymentDB.accounts.id          |
| amount          | NUMERIC(18,2) | Transaction amount                        |
| currency        | CHAR(3)       | Currency code                             |
| status          | VARCHAR(20)   | e.g., PENDING, COMPLETED                  |
| initiated_at    | TIMESTAMP     | When transaction was initiated            |
| completed_at    | TIMESTAMP     | When transaction was completed (nullable) |

### Table: notifications

| Column     | Type        | Notes                         |
| ---------- | ----------- | ----------------------------- |
| id         | UUID        | Primary key                   |
| user_id    | UUID        | References AuthDB.users.id    |
| type       | VARCHAR(50) | e.g., EMAIL, SMS              |
| message    | TEXT        | Notification message          |
| is_read    | BOOLEAN     | Read status                   |
| created_at | TIMESTAMP   | When notification was created |

---

_End of high-level schema model_
