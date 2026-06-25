const express = require("express");
const bicycleController = require("../controllers/bicycle.controller");

const router = express.Router();

router.post("/bicycles", bicycleController.createBicycle);
router.get("/bicycles", bicycleController.getBicycles);
router.get("/bicycles/:id", bicycleController.getBicycleById);
router.put("/bicycles/:id", bicycleController.updateBicycle);
router.delete("/bicycles/:id", bicycleController.deleteBicycle);

module.exports = router;