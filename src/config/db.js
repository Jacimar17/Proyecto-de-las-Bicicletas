const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://admin_bicis:1234@bicicletas-cluster.mepyxlc.mongodb.net/bicicletas"
    );

    console.log("MongoDB conectado");
  } catch (error) {
    console.log("Error de conexión:", error);
  }
};

module.exports = connectDB;