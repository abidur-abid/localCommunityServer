const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "secret",
    { expiresIn: "7d" }
  );
  return token;
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Authorization header missing");
  }
  
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send("Token missing");
  }

  try {
    const verify = jwt.verify(token, "secret");
    if (!verify?.email) {
      return res.status(401).send("You are not authorized");
    }
    req.user = verify.email;
    next();
  } catch (error) {
    return res.status(401).send("Invalid token");
  }
}

const uri = `mongodb+srv://abidurabid:bBSKcG0sqU8Xe1aT@localcommunity.zs8lz.mongodb.net/?retryWrites=true&w=majority&appName=localCommunity`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const usersCollection = client.db("localCommunity").collection("users");
    const newsCollection = client.db("localCommunity").collection("news");

    app.get('/', (req, res) => {
      res.send('Server is Running');
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const token = createToken(user);
      const filter = { email: user.email };
      const existingUser = await usersCollection.findOne(filter);
      if (existingUser) {
        return res.status(400).send({ message: "User Already Exists" });
      }
      await usersCollection.insertOne(user);
      res.send({ token });
    });

    app.put("/users/:id", async (req, res) => {
      const id = req.params.id;
      const { newName, newEmail, photo } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateInfo = {
        $set: {
          name: newName,
          email: newEmail,
          photo
        }
      };
      const result = await usersCollection.updateOne(filter, updateInfo);
      res.send(result);
    });

    app.get("/news", async (req, res) => {
      const result = await newsCollection.find().toArray();
      res.send(result);
    });

    app.get("/news/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await newsCollection.findOne(filter);
      res.send(result);
    });

    app.post("/news", verifyToken, async (req, res) => {
      const newNews = req.body;
      const result = await newsCollection.insertOne(newNews);
      res.send(result);
    });

    app.delete("/news/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await newsCollection.deleteOne(filter);
      res.send(result);
    });

    app.put("/news/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const news = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateInfo = {
        $set: {
          location: news.newLocation,
          topicName: news.newTopicName,
          data: news.newData,
          description: news.newDescription
        }
      };
      const result = await newsCollection.updateOne(filter, updateInfo, options);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
