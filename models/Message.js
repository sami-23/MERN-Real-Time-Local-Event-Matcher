const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  time: Date,
});

module.exports = mongoose.model("Message", MessageSchema);