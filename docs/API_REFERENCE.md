# API Reference

## Base URL

All endpoints are exposed via the API Gateway at:

```text
http://<HOST>:4000
```

Replace `<HOST>` with your gateway host (e.g., `localhost`).

## Authentication

Most endpoints (except `/health`) require authentication via Clerk. Include your bearer token in the `Authorization` header:

```http
Authorization: Bearer <CLERK_TOKEN>
```

## API Gateway

### GET /health

Check if the API Gateway is running.
**Response** `200 OK`

```json
{ "status": "OK", "message": "API Gateway is running" }
```

## Transactions Proxy

Paths under `/transactions` are proxied to the Transaction Service and protected by authentication.

### Accounts

- **GET** `/transactions/v1/accounts`
  List all accounts for the authenticated user.
- **GET** `/transactions/v1/accounts/:accountId`
  Get details of a specific account.
  - **Path Parameters**:
    - `accountId` (string, UUID) — Account ID.
- **POST** `/transactions/v1/accounts`
  Create a new account.
  **Request Body**:
  ```json
  { "currency": "USD" }
  ```

### Transfers

- **POST** `/transactions/v1/transfers`
  Initiate a transfer between accounts.
  **Request Body**:
  ```json
  {
    "fromAccountId": "<UUID>",
    "toAccountId": "<UUID>",
    "amount": 100,
    "currency": "USD"
  }
  ```
- **GET** `/transactions/v1/transfers`
  List transactions with optional query parameters:
  - `type`: `incoming` or `outgoing`
  - `status`: `PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`
  - `fromDate` / `toDate`: date range filter (`YYYY-MM-DD`)
  - `page` / `limit`: pagination
- **GET** `/transactions/v1/transfers/:transactionId`
  Get details of a specific transaction.
- **PATCH** `/transactions/v1/transfers/:transactionId/cancel`
  Cancel a pending transaction.
- **GET** `/transactions/v1/transfers/account/:accountId`
  Get all transactions for a specific account.

### Funding

- **POST** `/transactions/v1/funding/deposit`
  Deposit funds to an account.
  **Request Body**:
  ```json
  {
    "accountId": "<UUID>",
    "amount": 100,
    "currency": "USD"
  }
  ```
  **Response** `201 Created` with a message and the transaction object.
- **POST** `/transactions/v1/funding/withdraw`
  Withdraw funds from an account.
  **Request Body**:
  ```json
  {
    "accountId": "<UUID>",
    "amount": 50,
    "currency": "USD"
  }
  ```
  **Response** `201 Created` with a message and the transaction object.

## Notifications Proxy

Paths under `/notifications` are proxied to the Notification Service and protected by authentication.

- **GET** `/notifications/health`
  Check if the Notification Service is running.
  **Response** `200 OK`

```json
{
  "status": "ok",
  "message": "Notification service is running",
  "emailService": true
}
```

> The Notification Service currently processes notifications asynchronously and exposes only the health endpoint.

## Reporting Proxy

Paths under `/reports` are proxied to the Reporting Service and protected by authentication.

### Health Check

- **GET** `/reports/health`
  Check if the Reporting Service is running.
  **Response** `200 OK`

```json
{ "status": "ok", "message": "Reporting service is running" }
```

### Account Report

- **GET** `/reports/accounts/:accountId`
  Retrieve a transaction balance report for a specific account.
  - **Path Parameters**:
    - `accountId` (string, UUID)
  - **Query Parameters**:
    - `startDate` (string, `YYYY-MM-DD`) — Start of date range.
    - `endDate` (string, `YYYY-MM-DD`) — End of date range.
    - `groupBy` (string, optional) — e.g., `day`, `month`.
    - `currency` (string, optional) — Filter by currency.

### User Report

- **GET** `/reports/users/:userId`
  Retrieve a transaction balance report for a specific user (all accounts).
  - **Path Parameters**:
    - `userId` (string, UUID)
  - **Query Parameters**: same as Account Report.
