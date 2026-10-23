import express = require("express");
import bicycleController = require("./bicycle.controller");

const router = express.Router();

router.post("/bicycles", bicycleController.createBicycle);
router.get("/bicycles", bicycleController.getBicycles);
router.get("/bicycles/:id", bicycleController.getBicycleById);
router.put("/bicycles/:id", bicycleController.updateBicycle);
router.delete("/bicycles/:id", bicycleController.deleteBicycle);
router.patch("/bicycles/:id/status", bicycleController.updateBicycleStatus);
router.patch("/bicycles/:id/request", bicycleController.requestBicycle);

export = router;