export interface Account {
  id: string;
  userId: string;
  currency: string;
  balance: number;
  createdAt: string;
}

export interface CreateAccountRequest {
  currency: string;
}
