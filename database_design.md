# Mini-InstaPay Database Schema

This file presents a high-level relational schema for Mini-InstaPay, organized into two databases: an **Auth Database** for user identity and authentication, and a **Payment Database** for account balances, transactions, notifications, and logs.

---

## Auth Database

### Table: users

| Column        | Type         | Notes                    |
| ------------- | ------------ | ------------------------ |
| id            | UUID         | Primary key              |
| email         | VARCHAR(255) | Unique                   |
| password_hash | TEXT         | Hashed password          |
| full_name     | VARCHAR(100) |                          |
| created_at    | TIMESTAMP    | Timestamp of creation    |
| updated_at    | TIMESTAMP    | Timestamp of last update |

### Table: sessions

| Column     | Type      | Notes                      |
| ---------- | --------- | -------------------------- |
| id         | UUID      | Primary key                |
| user_id    | UUID      | References AuthDB.users.id |
| token      | TEXT      | Session token              |
| expires_at | TIMESTAMP | Token expiration time      |

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

### Table: audit_logs

| Column     | Type        | Notes                           |
| ---------- | ----------- | ------------------------------- |
| id         | BIGSERIAL   | Primary key                     |
| service    | VARCHAR(50) | Originating service name        |
| event      | VARCHAR(50) | Event type                      |
| payload    | JSONB       | Optional event data             |
| created_at | TIMESTAMP   | When the log entry was recorded |

---

_End of high-level schema model_
