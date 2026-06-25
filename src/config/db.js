const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://admin_bicis:1234@bicicletas-cluster.mepyxlc.mongodb.net/bicicletas"
    );

    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB connection error:", error.message);
  }
};

module.exports = connectDB;