const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
  location: {
    coordinates: {
      type: [Number], // [lng, lat]
      index: "2dsphere"
    }
  }
});

module.exports = mongoose.model("User", UserSchema);