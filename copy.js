const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const app = express();
const port = process.env.PORT;
const { MongoClient } = require("mongodb");
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI);

async function connectToMongoDB() {
  try {
    const db = client.db("legalEaseDB");
    const lawyersCollection = db.collection("lawyers");
    const usersCollection = db.collection("users");
    const paymentCollection = db.collection("payments");

    // CREATE LAWYER PROFILE

    app.post("/lawyers", async (req, res) => {
      const {
        name,
        email,
        role,
        specialization,
        fee,
        bio,
        image,
        availability,
        published,
        createdAt,
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

      return result;
    });

    // app.post("/api/lawyers", async (req, res) => {
    //   try {
    //     const lawyerData = req.body;

    //     const existingLawyer = await lawyersCollection.findOne({
    //       email: lawyerData.email,
    //     });

    //     if (existingLawyer) {
    //       return res.status(409).send({
    //         message: "Lawyer profile already exists",
    //       });
    //     }

    //     const newLawyer = {
    //       name: lawyerData.name,
    //       email: lawyerData.email,
    //       role: "lawyer",
    //       specialization: lawyerData.specialization,
    //       fee: Number(lawyerData.fee),
    //       bio: lawyerData.bio,
    //       image: lawyerData.image,
    //       availability: lawyerData.availability || "Available",
    //       published: true,
    //       createdAt: new Date(),
    //     };

    //     const result = await lawyersCollection.insertOne(newLawyer);

    //     res.status(201).send(result);
    //   } catch (error) {
    //     console.error(error);

    //     res.status(500).send({
    //       message: "Failed to create lawyer profile",
    //     });
    //   }
    // });

    app.get("/lawyers", async (req, res) => {
      try {
        const result = await lawyersCollection
          .find({ published: true })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch lawyers",
        });
      }
    });

    app.get("/lawyers/my-profile/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const lawyer = await lawyersCollection.findOne({
          email,
        });

        res.send(lawyer || null);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch profile",
        });
      }
    });

    // app.get("/featured-lawyers", async (req, res) => {
    //   const cursor = lawyersCollection.find().limit(6);
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    // ==========================================
    // UPDATE LAWYER PROFILE
    // ==========================================

    app.patch("/lawyers/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid lawyer ID",
          });
        }

        const updatedData = {
          ...req.body,
        };

        delete updatedData._id;
        delete updatedData.email;
        delete updatedData.role;
        delete updatedData.createdAt;

        if (updatedData.fee !== undefined) {
          updatedData.fee = Number(updatedData.fee);
        }

        const result = await lawyersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updatedData,
          },
        );

        res.send(result);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to update lawyer profile",
        });
      }
    });

    // ==========================================
    // DELETE LAWYER PROFILE
    // ==========================================

    app.delete("/lawyers/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).send({
            message: "Invalid lawyer ID",
          });
        }

        const result = await lawyersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to delete lawyer profile",
        });
      }
    });

    // await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

// Call this only when your application terminates
async function disconnectFromMongoDB() {
  //   await client.close();
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
