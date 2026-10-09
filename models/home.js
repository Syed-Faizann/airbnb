const mongoose = require("mongoose");

const homeSchema = new mongoose.Schema({
  houseName: { type: String, required: true },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  rating: { type: Number, required: true, default: 4.85 },
  photoUrl: { type: String, default: "" },
  photos: {
    type: [String],
    default: []
  },
  category: { type: String, default: "City Flats" },
  description: { type: String, default: "Experience exceptional comfort in this designer flat featuring contemporary furnishings, high-speed Wi-Fi, premium linens, and breathtaking views in a prime neighborhood." },
  bedrooms: { type: Number, default: 2 },
  beds: { type: Number, default: 2 },
  bathrooms: { type: Number, default: 1 },
  maxGuests: { type: Number, default: 4 },
  hostName: { type: String, default: "Alex (Superhost)" },
  amenities: {
    type: [String],
    default: ["Fast Wi-Fi (300 Mbps)", "Full Chef's Kitchen", "Dedicated Workspace", "Air Conditioning", "In-unit Washer & Dryer", "Free Street Parking", "55\" 4K Smart TV", "Self Check-in Keypad"]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Home", homeSchema);