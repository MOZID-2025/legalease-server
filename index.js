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
    const userCollection = db.collection("user");
    const paymentCollection = db.collection("payments");
    const hiringRequestsCollection = db.collection("hiringRequests");
    const commentsCollection = db.collection("comments");

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

    // Get logged-in user's comments
    app.get("/comments/user/:email", async (req, res) => {
      const email = req.params.email;

      const result = await commentsCollection
        .find({ userEmail: email })
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });

    // Update comment
    app.patch("/comments/:id", async (req, res) => {
      const { ObjectId } = require("mongodb");

      const { id } = req.params;
      const { comment } = req.body;

      const result = await commentsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            comment,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" },
      );

      res.send(result.value || result);
    });

    // Delete comment
    app.delete("/comments/:id", async (req, res) => {
      const { ObjectId } = require("mongodb");

      const result = await commentsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      res.send(result);
    });

    app.get("/hiring-requests/user/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await hiringRequestsCollection
          .find({ userEmail: email })
          .sort({ hiringDate: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch hiring history",
        });
      }
    });

    //user profile
    app.patch("/users/profile", async (req, res) => {
      try {
        const { email, name, image, bio } = req.body;

        if (!email) {
          return res.status(400).send({
            message: "User email is required",
          });
        }

        if (!name?.trim()) {
          return res.status(400).send({
            message: "Full name is required",
          });
        }

        const result = await usersCollection.updateOne(
          { email },
          {
            $set: {
              name: name.trim(),
              image: image || "",
              bio: bio?.trim() || "",
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        res.send({
          success: true,
          message: "Profile updated successfully",
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to update profile",
        });
      }
    });

    //Hiring request

    app.post("/hiring-requests", async (req, res) => {
      try {
        const hiringRequest = req.body;

        const newRequest = {
          userEmail: hiringRequest.userEmail,
          userName: hiringRequest.userName,

          lawyerId: hiringRequest.lawyerId,
          lawyerName: hiringRequest.lawyerName,
          lawyerEmail: hiringRequest.lawyerEmail,

          specialization: hiringRequest.specialization,
          fee: Number(hiringRequest.fee),

          hiringDate: new Date(),

          status: "pending",
          paymentStatus: "unpaid",

          createdAt: new Date(),
        };

        const result = await hiringRequestsCollection.insertOne(newRequest);

        res.status(201).send({
          success: true,
          message: "Hiring request sent successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Hiring request error:", error);

        res.status(500).send({
          success: false,
          message: "Failed to create hiring request",
        });
      }
    });

    app.get("/hiring-requests/lawyer/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const requests = await hiringRequestsCollection
          .find({ lawyerEmail: email })
          .sort({ hiringDate: -1 })
          .toArray();

        res.send(requests);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch hiring requests",
        });
      }
    });

    app.patch("/hiring-requests/:id/accept", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await hiringRequestsCollection.updateOne(
          {
            _id: new ObjectId(id),
            status: "pending",
          },
          {
            $set: {
              status: "accepted",
              paymentStatus: "unpaid",
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            message: "Request not found",
          });
        }

        res.send({
          success: true,
          message: "Hiring request accepted",
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to accept request",
        });
      }
    });

    app.patch("/hiring-requests/:id/reject", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await hiringRequestsCollection.updateOne(
          {
            _id: new ObjectId(id),
            status: "pending",
          },
          {
            $set: {
              status: "rejected",
              updatedAt: new Date(),
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            message: "Request not found",
          });
        }

        res.send({
          success: true,
          message: "Hiring request rejected",
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to reject request",
        });
      }
    });

    // Get all users
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find({}).toArray();

        res.send(users);
      } catch (error) {
        res.status(500).send({
          message: "Failed to fetch users",
        });
      }
    });

    app.patch("/users/:id/role", async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body;

        const allowedRoles = ["client", "lawyer", "admin"];

        if (!allowedRoles.includes(role)) {
          return res.status(400).send({
            message: "Invalid role",
          });
        }

        const result = await usersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              role: role,
            },
          },
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        res.send({
          success: true,
          message: "User role updated successfully",
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to update user role",
        });
      }
    });

    app.delete("/users/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
          return res.status(404).send({
            message: "User not found",
          });
        }

        res.send({
          success: true,
          message: "User deleted successfully",
        });
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to delete user",
        });
      }
    });

    app.get("/users/clients", async (req, res) => {
      try {
        const clients = await usersCollection
          .find({ role: "client" })
          .toArray();

        res.send(clients);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch clients",
        });
      }
    });

    app.get("/transactions", async (req, res) => {
      try {
        const transactions = await transactionsCollection
          .find({})
          .sort({ createdAt: -1 })
          .toArray();

        res.send(transactions);
      } catch (error) {
        console.error(error);

        res.status(500).send({
          message: "Failed to fetch transactions",
        });
      }
    });

    app.get("/admin/analytics", async (req, res) => {
      try {
        const totalUsers = await usersCollection.countDocuments();

        const totalLawyers = await lawyersCollection.countDocuments();

        const totalHires = await hiringRequestsCollection.countDocuments();

        const revenueResult = await paymentCollection
          .aggregate([
            {
              $group: {
                _id: null,
                totalRevenue: {
                  $sum: "$amount",
                },
              },
            },
          ])
          .toArray();

        const totalRevenue =
          revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.send({
          totalUsers,
          totalLawyers,
          totalHires,
          totalRevenue,
        });
      } catch (error) {
        console.error("Analytics error:", error);

        res.status(500).send({
          message: "Failed to load analytics",
          error: error.message,
        });
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
