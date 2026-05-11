const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: String,
  description: String,
  location: {
    coordinates: {
      type: [Number], // [lng, lat]
      index: "2dsphere"
    }
  },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: Date,
});

module.exports = mongoose.model("Event", EventSchema);