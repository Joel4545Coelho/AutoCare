require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
app.use(express.static(path.join(__dirname, 'dist')));

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const inqueritosRoutes = require("./routes/inqueritosRoutes");
const doencasRoutes = require("./routes/doencasRoutes");
const perguntasRoutes = require("./routes/perguntasRoutes");
const newsRoutes = require("./routes/newsRoutes");
const requestsRoutes = require("./routes/requestsRoutes");
const medicoRoutes = require("./routes/medicoRoutes");
const forumRoutes = require("./routes/forumRoutes");
const homeRoutes = require("./routes/homeRoutes");
const profileroutes = require('./routes/profileroutes');
const subroutes = require('./routes/subscriptionRoutes');
const receitasP = require('./routes/receitasPaciente');
const receitas_medico = require('./routes/receitas_medico')
const RatingRoutes = require('./routes/ratingRoutes').default;

const DATABASE_URL = "mongodb://joelcoelho1309:12345@ac-vb4qym0-shard-00-00.1kdd3py.mongodb.net:27017,ac-vb4qym0-shard-00-01.1kdd3py.mongodb.net:27017,ac-vb4qym0-shard-00-02.1kdd3py.mongodb.net:27017/autocare?replicaSet=atlas-qsytdp-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: ["http://localhost", "http://localhost:5000", "http://localhost:8100", DATABASE_URL, "https://autocare-vvzo.onrender.com", "https://autocare-ionic.onrender.com", "https://autocare-ionic-1a0z.onrender.com", "https://feppv-vitalure.s3.eu-central-1.amazonaws.com", "https://pay.easypay.pt", "stun:stun.l.google.com:19302"],
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  },
});
const Message = require("./models/message");

app.use(
  cors({
    origin: ["http://localhost", "http://localhost:5000", "http://localhost:8100", DATABASE_URL, 'https://autocare-vvzo.onrender.com', "https://autocare-ionic.onrender.com", "https://autocare-ionic-1a0z.onrender.com", "https://feppv-vitalure.s3.eu-central-1.amazonaws.com", "https://pay.easypay.pt,", "stun:stun.l.google.com:19302"],
    methods: ["GET", "PUT", "POST", "DELETE"],
    credentials: true,
  })
);

const PORT = process.env.PORT || 25565;

mongoose.connect(DATABASE_URL, {})
  .then(() => console.log("Conectado ao MongoDB!"))
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
  });

// Configurações adicionais
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configuração da view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Rotas
app.use(authRoutes);
app.use(chatRoutes);
app.use(adminRoutes);
app.use(newsRoutes);
app.use(requestsRoutes);
app.use(forumRoutes);
app.use("/inqueritos", inqueritosRoutes);
app.use(doencasRoutes);
app.use("/perguntas", perguntasRoutes);
app.use(medicoRoutes);
app.use(homeRoutes);
app.use(profileroutes);
app.use(receitasP);
app.use('/assinaturas', subroutes);
app.use(receitas_medico)
app.use(RatingRoutes);
app.use('/assinaturas', subroutes);
app.get("/pacientes", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// WebSocket com Socket.io
io.on("connection", (socket) => {
  console.log("A user connected: " + socket.id);

  socket.on("joinRoom", async (roomId) => {
    if (roomId) {
      console.log(`User ${socket.id} joined room ${roomId}`);
      socket.join(roomId);

      const messages = await Message.find({ chatId: roomId }).sort({ createdAt: 1 });
      socket.emit("previousMessages", messages);
    } else {
      console.error("roomId is undefined on the server!");
    }
  });

  socket.on("sendMessage", async ({ senderId, receiverId, message, type }) => {
    const roomId = [senderId, receiverId].sort().join("_");

    const newMessage = new Message({
      chatId: roomId,
      senderId,
      receiverId,
      content: message,
      type: type,
      seen: false,
    });

    await newMessage.save();

    io.to(roomId).emit("receiveMessage", {
      _id: newMessage._id,
      senderId,
      receiverId,
      content: message,
      createdAt: newMessage.createdAt,
      type: type,
      room: roomId
    });
  });

  socket.on("markMessagesAsSeen", async ({ chatId, userId }) => {
    try {
      await Message.updateMany(
        { chatId, receiverId: userId, seen: false },
        { $set: { seen: true } }
      );
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected: " + socket.id);
  });

  socket.on("markMessageAsDeleted", async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.log("Message not found");
        return;
      }
      message.deleted = true;
      await message.save();
      console.log(`Marked message as deleted for message ID: ${messageId} and user: ${userId}`);
    } catch (error) {
      console.error("Error marking message as deleted:", error);
    }
  });


  socket.on("callUser", ({ to, offer }) => {
    io.to(to).emit("callUser", { from: socket.id, offer });
    console.log("Creating offer:", offer);
  });

  socket.on("answerCall", ({ to, answer }) => {
    io.to(to).emit("answerCall", { from: socket.id, answer });
    console.log("Sending answer:", answer);
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(to).emit("iceCandidate", { from: socket.id, candidate });
  });


});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});