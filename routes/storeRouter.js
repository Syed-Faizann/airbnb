const express = require("express");
const storeRouter = express.Router();
const storeController = require("../controllers/store");

storeRouter.get("/", storeController.getIndex);
storeRouter.get("/home-list", storeController.getHomes);
storeRouter.get("/home/:homeId", storeController.getHomeDetails);
storeRouter.get("/reserve/:homeId", storeController.getReserveHome);

storeRouter.get("/favourite-list", storeController.getFavouriteList);
storeRouter.post("/favourite-list", storeController.postFavouriteList);
storeRouter.post("/favourites/delete/:homeId", storeController.postRemoveFromFavourite);

storeRouter.get("/bookings", storeController.getBookings);
storeRouter.post("/bookings/book/:homeId", storeController.postBookHome);
storeRouter.post("/bookings/cancel/:bookingId", storeController.postCancelBooking);

storeRouter.get("/seed-samples", storeController.seedSampleHomes);
storeRouter.get("/clear-demo-data", storeController.clearDemoData);

module.exports = storeRouter;
