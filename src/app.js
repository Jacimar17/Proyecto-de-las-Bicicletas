const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    message: "API de alquiler de bicicletas funcionando correctamente",
    version: "1.0.0",
    endpoints: {
      api: "/api",
    },
  });
});

module.exports = app;