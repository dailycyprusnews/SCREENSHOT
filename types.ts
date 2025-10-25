
export interface ReceiptData {
  transactionId: string;
  dateTime: string;
  amount: string;
  fromAccount: string;
  beneficiaryName: string;
  beneficiaryAccount: string;
  purpose: string;
  comments: string;
  channel: string;
}

export type ReceiptField = keyof ReceiptData;