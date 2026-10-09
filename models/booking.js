const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  home: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Home",
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  guestName: {
    type: String,
    default: "Guest Traveler"
  },
  guestEmail: {
    type: String,
    default: "guest@airbnb.com"
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    required: true
  },
  nights: {
    type: Number,
    required: true,
    default: 1
  },
  guests: {
    type: Number,
    default: 2
  },
  pricePerNight: {
    type: Number,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["Confirmed", "Cancelled"],
    default: "Confirmed"
  },
  refundStatus: {
    type: String,
    enum: ["None", "Full Refund Processed", "No Refund Eligible"],
    default: "None"
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  cancelledAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Fast conflict querying
bookingSchema.index({ home: 1, checkIn: 1, checkOut: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
