const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");

    const db = client.db("legalEaseDB");
    const lawyersCollection = db.collection("lawyers");
    const usersCollection = db.collection("users");
    const paymentCollection = db.collection("payments");

    // CREATE LAWYER PROFILE
    app.post("/lawyers", async (req, res) => {
      try {
        const {
          name,
          email,
          role,
          specialization,
          fee,
          bio,
          image,
          availability,
        } = req.body;

        const addData = {
          name,
          email,
          role,
          specialization,
          fee,
          bio,
          image,
          availability,
          published: true,
          createdAt: new Date(),
        };

        const result = await lawyersCollection.insertOne(addData);
        res.status(201).send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to create lawyer" });
      }
    });

    // GET ALL LAWYERS (published, newest first)
    app.get("/lawyers", async (req, res) => {
      try {
        const result = await lawyersCollection
          .find({ published: true })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch lawyers" });
      }
    });

    // GET LAWYER BY EMAIL
    app.get("/lawyers/my-profile/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const lawyer = await lawyersCollection.findOne({ email });
        res.send(lawyer || null);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch profile" });
      }
    });

    // GET FEATURED LAWYERS (first 6)
    app.get("/featured-lawyers", async (req, res) => {
      try {
        const result = await lawyersCollection
          .find({ published: true })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch featured lawyers" });
      }
    });

    // GET SINGLE LAWYER
    app.get("/lawyers/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid lawyer ID",
          });
        }

        const lawyer = await lawyersCollection.findOne({
          _id: new ObjectId(id),
          published: true,
        });

        if (!lawyer) {
          return res.status(404).send({
            message: "Lawyer not found",
          });
        }

        res.send(lawyer);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch lawyer details",
        });
      }
    });

    // UPDATE LAWYER PROFILE
    app.patch("/lawyers/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid lawyer ID" });
        }

        const updatedData = { ...req.body };
        delete updatedData._id;
        delete updatedData.email;
        delete updatedData.role;
        delete updatedData.createdAt;

        if (updatedData.fee !== undefined) {
          updatedData.fee = Number(updatedData.fee);
        }

        const result = await lawyersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData },
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to update lawyer profile" });
      }
    });

    // DELETE LAWYER PROFILE
    app.delete("/lawyers/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid lawyer ID" });
        }

        const result = await lawyersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to delete lawyer profile" });
      }
    });

    // HEALTH CHECK
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // Start server after DB connection
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (err) {
    console.dir(err);
    process.exit(1);
  }
}

connectToMongoDB();

async function disconnectFromMongoDB() {
  await client.close();
}

// working!
