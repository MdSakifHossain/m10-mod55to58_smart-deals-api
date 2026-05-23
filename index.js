import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import logger from "./lib/logger.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    logger("Connected to MongoDB");

    const db = client.db("smart_deals_db");
    const userCollection = db.collection("users");
    const productCollection = db.collection("products");
    const bidCollection = db.collection("bids");

    // ========================================================================
    // ---  USERS  ------------------------------------------------------------
    // ========================================================================

    /**
     *  POST /users
     * */
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = {
        firebase_uid: user.firebase_uid,
      };

      const existingUser = await userCollection.findOne(query);

      if (!existingUser) {
        const reult = await userCollection.insertOne({
          ...user,
          created_at: new Date(),
          last_login: new Date(),
        });

        return res.json({
          success: true,
          message: "Account Created Successfully",
          isNewUser: true,
        });
      }

      // returning user - just update last_login
      const result = await userCollection.updateOne(
        query, // which to update
        // what to update
        {
          $set: {
            last_login: new Date(),
          },
        },
      );

      res.json({
        success: true,
        message: "Welcome back User",
        isNewUser: false,
      });
    });

    /**
     *  GET /users
     * */
    app.get("/users", async (req, res) => {
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.json(result);
    });

    /**
     *  GET /users/:id
     * */
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.json(result);
    });

    /**
     *  DELETE /users/:id
     * */
    app.delete("/users/:id", async (req, res) => {
      const firebase_uid = req.params.id;
      const query = { firebase_uid };
      const result = await userCollection.deleteOne(query);
      res.json({ success: true, message: "Account Deleted Successfully" });
    });

    // ========================================================================
    // ---  PRODUCTS  ---------------------------------------------------------
    // ========================================================================

    /**
     *  POST /products
     * */
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.json(result);
    });

    /**
     *  DELETE /products/:id
     * */
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await productCollection.deleteOne(query);
      res.json(result);
    });

    /**
     *  PATCH /products/:id
     * */
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const docFromBody = req.body;
      const query = {
        _id: new ObjectId(id),
      };
      const updatedDoc = {
        $set: docFromBody,
      };
      const result = await productCollection.updateOne(query, updatedDoc);
      res.json(result);
    });

    /**
     *  GET /products
     * */
    app.get("/products", async (req, res) => {
      const query = {};
      const result = await productCollection.find(query).toArray();
      res.json(result);
    });

    /**
     *  GET /products/:id
     * */
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.json(result);
    });

    // ========================================================================
    // ---  BIDS  -------------------------------------------------------------
    // ========================================================================

    /**
     * POST /bids
     * */
    app.post("/bids", async (req, res) => {
      const newBid = req.body;
      const result = await bidCollection.insertOne(newBid);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  logger(`It's alive on port: ${port}`);
});
