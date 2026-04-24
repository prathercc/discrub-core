export type Donation = {
  donorId: string;
  transactionId: string;
  timestamp: string;
  type: string;
  fromName: string;
  message: string;
  amount: number;
  currency: string;
};