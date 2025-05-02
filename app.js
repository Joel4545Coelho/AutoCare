const AWS = require('aws-sdk');
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const adminRoutes = require("./routes/adminRoutes");
const inqueritosRoutes = require("./routes/inqueritosRoutes");
const doencasRoutes = require("./routes/doencasRoutes");
const perguntasRoutes = require("./routes/perguntasRoutes");
const newsRoutes = require("./routes/newsRoutes");
const mrequestRoutes = require("./routes/mrequestRoutes");
const medicoRoutes = require("./routes/medicoRoutes");
const forumRoutes = require("./routes/forumRoutes");
const homeRoutes = require("./routes/homeRoutes");
const profileroutes = require('./routes/profileroutes');
const subroutes = require('./routes/subscriptionRoutes');
const receitasP = require('./routes/receitasPaciente');
const receitas_medico = require('./routes/receitas_medico')

const app = express();
const DATABASE_URL = "mongodb://joelcoelho1309:12345@ac-vb4qym0-shard-00-00.1kdd3py.mongodb.net:27017,ac-vb4qym0-shard-00-01.1kdd3py.mongodb.net:27017,ac-vb4qym0-shard-00-02.1kdd3py.mongodb.net:27017/autocare?replicaSet=atlas-qsytdp-shard-0&ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5000", "http://localhost:8100", DATABASE_URL, "https://autocare-gj6v.onrender.com"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

//INICIO DO BUCKET

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION // e.g., 'us-east-1'
});

app.get('/buckets', async (req, res) => {
  try {
    const data = await s3.listBuckets().promise();
    res.json(data.Buckets);
  } catch (err) {
    console.error('Error listing buckets:', err);
    res.status(500).send('Error listing buckets');
  }
});

// Example route to upload a file
app.post('/upload', express.json(), async (req, res) => {
  const { fileName, fileContent } = req.body;
  
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: fileContent
  };

  try {
    const data = await s3.upload(params).promise();
    res.json({ message: 'File uploaded successfully', location: data.Location });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).send('Error uploading file');
  }
});

app.get('/download/:fileName', async (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: req.params.fileName
  };

  try {
    const data = await s3.getObject(params).promise();
    res.send(data.Body);
  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).send('Error downloading file');
  }
});

app.delete('/delete/:fileName', async (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: req.params.fileName
  };

  try {
    await s3.deleteObject(params).promise();
    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).send('Error deleting file');
  }
});

//FIM DO BUCKET

const Message = require("./models/message");

app.use(
  cors({
    origin: ["http://localhost:5000", "http://localhost:8100", DATABASE_URL, 'https://autocare-gj6v.onrender.com'],
    credentials: true,
  })
);

const PORT = process.env.PORT || 25565;

mongoose
  .connect(DATABASE_URL, {
  })
  .then(() => console.log("Conectado ao MongoDB!"))
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
    process.exit(1);
  });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.set("view engine", "ejs");

app.use(authRoutes);
app.use(chatRoutes);
app.use(adminRoutes);
app.use(newsRoutes);
app.use(mrequestRoutes);
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

  socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
    const roomId = [senderId, receiverId].sort().join("_");

    const newMessage = new Message({
      chatId: roomId,
      senderId,
      receiverId,
      content: message,
      seen: false,
    });

    await newMessage.save();

    io.to(roomId).emit("receiveMessage", {
      _id: newMessage._id,
      senderId,
      receiverId,
      content: message,
      createdAt: newMessage.createdAt,
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
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});