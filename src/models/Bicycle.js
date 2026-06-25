const mongoose = require("mongoose");

const bicycleSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Bicycle", bicycleSchema);