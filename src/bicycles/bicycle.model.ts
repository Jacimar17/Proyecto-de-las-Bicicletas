export type BicycleStatus = "AVAILABLE" | "IN_USE" | "NOT_SUITABLE";

export interface Bicycle {
  _id?: string;
  code: string;
  currentStation: string;
  status: BicycleStatus;
  unlockCode: string;
  rentedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
