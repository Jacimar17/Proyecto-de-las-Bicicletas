const express = require("express");
const cors = require("cors");
const bicycleRoutes = require("./routes/bicycle.routes");
const maintenanceRoutes = require("./routes/maintenance.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "Bike rental API is running",
    version: "1.0.0",
    endpoints: {
      api: "/api",
      bicycles: "/api/bicycles",
      app.use("/api/maintenance", maintenanceRoutes);
    },
  });
});

app.use("/api", bicycleRoutes);

module.exports = app;