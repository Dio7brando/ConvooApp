import { connect } from "mongoose";
import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnLine = {};

export const connectToSocket = (server) => {
  // main server ke socket se connect kara
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true,
    },
  }); //Socket.io server bana diya

  /* Jab koi user connect kare => 
     jab bhi koi user aye usse socket id do */

  io.on("connection", (socket) => {
    socket.on("join-call", (path) => {
      // user ne room join kara, client bolega mujhe is room(path) mai join karwa
      if (connections[path] === undefined) {
        // room exist nahi karta toh naya empty room bana do
        connections[path] = [];
      }
      connections[path].push(socket.id); // user ko room mai add kr diya

      timeOnLine[socket.id] = new Date(); //save kara yeh banda kab aya
      for (let a = 0; a < connections[path].length; a++) {
        //sabko batayo naya user aya, room ke sab users par loop
        io.to(connections[path][a]).emit(
          // sabko message bheja naya banda join hua hai
          "user-joined",
          socket.id,
          connections[path],
        );
      }
      // Purane messages bhejna agar hai toh(chat history)
      if (messages[path] !== undefined) {
        // agar room mai old chats hai
        for (let a = 0; a < messages[path].length; ++a) {
          // har message ke liye loop
          io.to(socket.id).emit(
            //naye user ko purane messaegs dikhayo
            "chat-message",
            messages[path][a][`data`],
            messages[path][a][`sender`],
            messages[path][a][`socket-id-sender`],
          );
        }
      }
    });

    // WebRTC Signalling =>
    socket.on("signal", (toId, message) => {
      // client bola yeh message us user ko bhejo
      io.to(toId).emit("signal", socket.id, message); // bhej diya
    });

    // Chat message =>
    socket.on("chat-message", (data, sender) => {
      // user ne message bheja
      const [matchingRoom, found] = Object.entries(connections).reduce(
        // user kis room mai hai woh dhundha
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        // agar room milgaya
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          // messages save kiye
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("message", matchingRoom, ":", sender, data); // console mai print

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id); // sabko bhej diya
        });
      }
    });

    socket.on("disconnect", () => {
      var diffTime = Math.abs(timeOnLine[socket.id] - new Date());

      var key;

      for (const [rooms, persons] of JSON.parse(
        JSON.stringify(Object.entries(connections)),
      )) {
        for (let a = 0; a < persons.length; ++a) {
          if (persons[a] === socket.id) {
            key = rooms;

            for (let a = 0; a < connections[key].length; ++a) {
              io.to(connections[key][a]).emit(`user-left`, socket.id);
            }
            var index = connections[key].indexOf(socket.id);
            connections[key].splice(index, 1);

            if (connections[key].length === 0) {
              delete connections[key];
            }
          }
        }
      }
    });
  });
};
