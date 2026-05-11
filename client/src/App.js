import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";

const ENDPOINT = "http://localhost:5000";

function App() {
  const [user, setUser] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [nearbyEvents, setNearbyEvents] = useState([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [socket, setSocket] = useState(null);

  // Geolocation
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(({ coords }) =>
      setLocation({ lat: coords.latitude, lng: coords.longitude })
    );
  }, []);

  // Fetch events
  useEffect(() => {
    if (location.lat && location.lng) {
      axios
        .get(
          `${ENDPOINT}/api/events/nearby?lat=${location.lat}&lng=${location.lng}`
        )
        .then((res) => setNearbyEvents(res.data.events));
    }
  }, [location, currentEvent]);

  // Socket connection
  useEffect(() => {
    if (!currentEvent) return;
    const sock = io(ENDPOINT);
    sock.emit("joinEventChat", {
      eventId: currentEvent._id,
      username: user.username,
    });
    sock.on("chatMessage", (msg) => setChat((prev) => [...prev, msg]));
    setSocket(sock);
    // Fetch previous messages
    axios
      .get(`${ENDPOINT}/api/event/${currentEvent._id}/messages`)
      .then((res) => setChat(res.data.messages));
    return () => sock.disconnect();
    // eslint-disable-next-line
  }, [currentEvent]);

  const handleSignup = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    const password = e.target.password.value;
    const res = await axios.post(`${ENDPOINT}/api/signup`, {
      username,
      password,
      location: { coordinates: [location.lng, location.lat] },
    });
    setUser(res.data.user);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await axios.post(`${ENDPOINT}/api/login`, {
      username: e.target.username.value,
      password: e.target.password.value,
    });
    setUser(res.data.user);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    const res = await axios.post(`${ENDPOINT}/api/event`, {
      title: newEventTitle,
      description: newEventDesc,
      location: { coordinates: [location.lng, location.lat] },
      creatorId: user._id,
    });
    setNearbyEvents([...nearbyEvents, res.data.event]);
    setNewEventTitle("");
    setNewEventDesc("");
  };

  const joinEvent = async (eventId) => {
    const res = await axios.post(`${ENDPOINT}/api/event/join`, {
      eventId,
      userId: user._id,
    });
    setCurrentEvent(res.data.event);
    setChat([]);
  };

  const sendMessage = () => {
    if (!msg.trim()) return;
    socket.emit("chatMessage", {
      eventId: currentEvent._id,
      senderId: user._id,
      text: msg,
    });
    setMsg("");
  };

  if (!user)
    return (
      <div>
        <h2>MERN Real-Time Local Event Matcher</h2>
        <h3>Signup</h3>
        <form onSubmit={handleSignup}>
          <input name="username" placeholder="Username" />
          <input name="password" type="password" placeholder="Password" />
          <button>Sign Up</button>
        </form>
        <h3>or Login</h3>
        <form onSubmit={handleLogin}>
          <input name="username" placeholder="Username" />
          <input name="password" type="password" placeholder="Password" />
          <button>Log In</button>
        </form>
      </div>
    );

  if (currentEvent)
    return (
      <div>
        <button onClick={() => setCurrentEvent(null)}>Back to Events</button>
        <h2>{currentEvent.title}</h2>
        <p>{currentEvent.description}</p>
        <h4>Chat:</h4>
        <div style={{ border: "1px solid #aaa", height: 200, overflowY: "auto" }}>
          {chat.map((m, i) => (
            <div key={i}>
              <b>{m.sender}:</b> {m.text} <small>{new Date(m.time).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    );

  return (
    <div>
      <h2>Welcome {user.username}</h2>
      <h3>Create New Event</h3>
      <form onSubmit={handleCreateEvent}>
        <input
          value={newEventTitle}
          onChange={(e) => setNewEventTitle(e.target.value)}
          placeholder="Event Title"
        />
        <input
          value={newEventDesc}
          onChange={(e) => setNewEventDesc(e.target.value)}
          placeholder="Description"
        />
        <button>Create</button>
      </form>
      <h3>Nearby Events</h3>
      <ul>
        {nearbyEvents.map((event) => (
          <li key={event._id}>
            <b>{event.title}</b> ({event.participants.length} joined)
            <br />
            <button onClick={() => joinEvent(event._id)}>Join &amp; Chat</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;