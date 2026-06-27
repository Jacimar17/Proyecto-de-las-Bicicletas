const express = require("express");
const cors = require("cors");
const bicycleRoutes = require("./routes/bicycle.routes");
const maintenanceRoutes = require("./routes/maintenance.routers");
const userRoutes = require("./routes/user.routes");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Bike rental API is running",
    version: "1.0.0",
    endpoints: {
      api: "/api",
      bicycles: "/api/bicycles",
      maintenance: "/api/maintenance",
      users: "/api/users",
    },
  });
});

app.use("/api", bicycleRoutes);
app.use("/api/maintenance", maintenanceRoutes);

module.exports = app;