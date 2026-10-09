const path = require("path");

const express = require("express");
const authRouter = express.Router();

// const rootDir = require('../utils/pathUtil');

const authController = require("../controllers/auth");

authRouter.get("/login", authController.getLogin);
authRouter.post("/login", authController.postLogin);
authRouter.post("/logout", authController.postLogout)
authRouter.get("/signup", authController.getSignup);
authRouter.post("/signup", authController.postSignup);
module.exports = authRouter;
