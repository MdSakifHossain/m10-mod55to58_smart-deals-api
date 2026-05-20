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

    /**
     * POST /users
     * */
    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const result = await userCollection.insertOne(newUser);
      res.json(result);
    });

    /**
     * POST /products
     * */
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.json(result);
    });

    /**
     * DELETE /products
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
