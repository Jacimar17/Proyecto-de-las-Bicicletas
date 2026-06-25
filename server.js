const app = require("./src/app");
const connectDB = require("./src/config/db");

connectDB();

const PORT = 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});