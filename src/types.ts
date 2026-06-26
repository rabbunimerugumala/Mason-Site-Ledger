export interface Place {
  placeId: string;
  placeName: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface Transaction {
  transactionId: string;
  placeId: string;
  date: string; // yyyy-mm-dd format
  amount: number;
  note?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string;
}
