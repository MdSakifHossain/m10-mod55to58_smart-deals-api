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
      logger("POST /users");
      try {
        await userCollection.insertOne({
          ...req.body,
          created_at: new Date(),
        });
        res.json({ success: true, isNewUser: true });
      } catch (err) {
        if (err.code === 11000) {
          return res.json({ success: true, isNewUser: false });
        }
        res.status(500).json({ success: false, error: err.message });
      }
    });

    /**
     *  GET /users
     * */
    app.get("/users", async (req, res) => {
      logger("GET /users");
      const query = {};
      const result = await userCollection.find(query).toArray();
      res.json(result);
    });

    /**
     *  GET /users/:id
     * */
    app.get("/users/:id", async (req, res) => {
      logger("GET /users/:id");
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.json(result);
    });

    /**
     *  PATCH /users/:uid
     * */
    app.patch("/users/:id", async (req, res) => {
      logger("PATCH /users");
      const firebase_uid = req.params.id;

      const updates = {};
      if (req.body.user_name !== undefined)
        updates.user_name = req.body.user_name;
      if (req.body.user_image !== undefined)
        updates.user_image = req.body.user_image;

      await userCollection.updateOne({ firebase_uid }, { $set: updates });

      res.json({ success: true });
    });

    /**
     *  DELETE /users/:id
     * */
    app.delete("/users/:id", async (req, res) => {
      logger("DELETE /users/:id");
      const firebase_uid = req.params.id;
      const query = { firebase_uid };
      const result = await userCollection.deleteOne(query);
      res.json({ success: true, message: "Account Deleted Successfully" });
    });

    /**
     *  GET /users/firebase/:uid
     * */
    app.get("/users/firebase/:uid", async (req, res) => {
      logger("GET /users/firebase/:uid");

      const uid = req.params.uid;

      const result = await userCollection.findOne({
        firebase_uid: uid,
      });

      res.json(result);
    });

    // ========================================================================
    // ---  PRODUCTS  ---------------------------------------------------------
    // ========================================================================

    /**
     *  POST /products
     * */
    app.post("/products", async (req, res) => {
      logger("POST /products");
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.json(result);
    });

    /**
     *  DELETE /products/:id
     * */
    app.delete("/products/:id", async (req, res) => {
      logger("DELETE /products/:id");
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
      logger("PATCH /products/:id");
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
      logger("GET /products");
      const query = {};
      const result = await productCollection.find(query).toArray();
      res.json(result);
    });

    /**
     *  GET /products/:id
     * */
    app.get("/products/:id", async (req, res) => {
      logger("GET /products/:id");
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
      logger("POST /bids");
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
