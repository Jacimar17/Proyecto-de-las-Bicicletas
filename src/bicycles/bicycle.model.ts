import { model, Schema } from "mongoose";

type BicycleStatus = "AVAILABLE" | "IN_USE" | "NOT_SUITABLE";

interface BicycleFields {
  code: string;
  currentStation: string;
  status: BicycleStatus;
  unlockCode: string;
  rentedBy: string | null;
}

const bicycleSchema = new Schema<BicycleFields>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    currentStation: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "IN_USE", "NOT_SUITABLE"],
      default: "AVAILABLE",
    },
    unlockCode: {
      type: String,
      required: true,
      trim: true,
    },
    rentedBy: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Bicycle = model<BicycleFields>("Bicycle", bicycleSchema);

export = Bicycle;