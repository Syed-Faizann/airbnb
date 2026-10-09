const express = require("express");
const hostRouter = express.Router();
const multer = require("multer");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3 }
});

const hostController = require("../controllers/host");

hostRouter.post("/upload-photos", upload.array("photos", 3), hostController.postUploadPhotos);
hostRouter.get("/addHome", hostController.getAddHome);
hostRouter.post("/addHome", upload.array("photos", 3), hostController.postAddHome);
hostRouter.post("/homeAdded", upload.array("photos", 3), hostController.postAddHome);
hostRouter.get("/host-home-list", hostController.getHostHomes);
hostRouter.get("/edit-home/:homeId", hostController.getEditHome);
hostRouter.post("/edit-home", upload.array("photos", 3), hostController.postEditHome);
hostRouter.post("/delete-home/:homeId", hostController.postDeleteHome);
module.exports = hostRouter;
