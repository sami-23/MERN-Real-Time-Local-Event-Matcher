const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const socketio = require("socket.io");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*",
  },
});

const User = require("./models/User");
const Event = require("./models/Event");
const Message = require("./models/Message");

app.use(cors());
app.use(express.json());

// ----- AUTH (Mock, replace in prod) -----
app.post("/api/signup", async (req, res) => {
  const { username, password, location } = req.body;
  if (!username || !password) return res.status(400).send("Missing fields");
  let exists = await User.findOne({ username });
  if (exists) return res.status(409).send("Username exists");
  const user = await User.create({ username, password, location });
  res.json({ user: { _id: user._id, username: user.username, location: user.location } });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  let user = await User.findOne({ username, password });
  if (!user) return res.status(401).send("Invalid credentials");
  res.json({ user: { _id: user._id, username: user.username, location: user.location } });
});

// ----- EVENT CREATION -----
app.post("/api/event", async (req, res) => {
  const { title, description, location, creatorId } = req.body;
  if (!title || !location || !creatorId) return res.status(400).send("Missing fields");
  const event = await Event.create({
    title,
    description,
    location,
    creator: creatorId,
    participants: [creatorId],
    createdAt: new Date(),
  });
  res.json({ event });
});

// ----- GET NEARBY EVENTS -----
app.get("/api/events/nearby", async (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).send("Missing coords");
  const events = await Event.find({
    "location.coordinates": {
      $geoWithin: {
        $centerSphere: [
          [parseFloat(lng), parseFloat(lat)],
          (parseFloat(radius) || 2) / 3963.2, // radius in miles, Earth in miles
        ],
      },
    },
  }).populate("participants", "username");
  res.json({ events });
});

// ----- JOIN EVENT -----
app.post("/api/event/join", async (req, res) => {
  const { eventId, userId } = req.body;
  let event = await Event.findById(eventId);
  if (!event) return res.status(404).send("Event not found");
  if (!event.participants.includes(userId)) {
    event.participants.push(userId);
    await event.save();
  }
  event = await event.populate("participants", "username");
  res.json({ event });
});

// ----- SOCKET.IO REAL-TIME -----
io.on("connection", (socket) => {
  // Expected to join event room
  socket.on("joinEventChat", ({ eventId, username }) => {
    socket.join(eventId);
    socket.to(eventId).emit("chatMessage", {
      sender: "System",
      text: `${username} joined the chat`,
      time: new Date(),
    });
  });

  socket.on("chatMessage", async ({ eventId, senderId, text }) => {
    const user = await User.findById(senderId);
    const message = await Message.create({
      event: eventId,
      sender: senderId,
      text,
      time: new Date(),
    });
    io.to(eventId).emit("chatMessage", {
      sender: user.username,
      text,
      time: message.time,
    });
  });
});

// ----- MONGOOSE CONNECTION -----
const MONGO_URL = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/eventmatcher";
mongoose.connect(MONGO_URL).then(() => {
  server.listen(5000, () => console.log("Server on http://localhost:5000"));
});