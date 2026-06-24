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

const varifyFirebaseToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: `Unauthorized Access` });
  }

  const token = req.headers.authorization.split(" ")[1];
  console.log({ token });
  next();
};

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

      try {
        const {
          seller_id,
          title,
          description,
          image,
          price_min,
          category,
          condition,
          usage,
        } = req.body;

        // Basic validation
        if (
          !seller_id ||
          !title ||
          !description ||
          !image ||
          !price_min ||
          !category ||
          !condition
        ) {
          return res.status(400).json({
            message: "Missing required fields",
          });
        }

        if (!ObjectId.isValid(seller_id)) {
          return res.status(400).json({
            message: "Invalid seller_id",
          });
        }

        if (!["fresh", "used"].includes(condition)) {
          return res.status(400).json({
            message: "Condition must be 'fresh' or 'used'",
          });
        }

        const parsedPrice = Number(price_min);

        if (Number.isNaN(parsedPrice)) {
          return res.status(400).json({
            message: "price_min must be a number",
          });
        }

        const product = {
          seller_id: new ObjectId(seller_id),
          title,
          description,
          image,
          status: "pending",
          price_min: parsedPrice,
          category,
          condition,
          usage: usage || null,
          created_at: new Date(),
        };

        const result = await productCollection.insertOne(product);

        res.status(201).json({
          insertedId: result.insertedId,
          message: "Product created successfully",
        });
      } catch (error) {
        logger(error);
        res.status(500).json({
          message: "Internal server error",
        });
      }
    });

    /**
     *  DELETE /products/:id
     * */
    app.delete("/products/:productId", async (req, res) => {
      try {
        logger("DELETE /products/:productId");

        const { productId } = req.params;
        const { user_id } = req.body;

        if (!ObjectId.isValid(productId)) {
          return res.status(400).json({
            message: "Invalid product ID",
          });
        }

        if (!user_id) {
          return res.status(400).json({
            message: "user_id is required",
          });
        }

        if (!ObjectId.isValid(user_id)) {
          return res.status(400).json({
            message: "Invalid user_id",
          });
        }

        const product = await productCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!product) {
          return res.status(404).json({
            message: "Product not found",
          });
        }

        // Ownership check
        if (product.seller_id.toString() !== user_id) {
          return res.status(403).json({
            message: "You are not allowed to delete this product",
          });
        }

        // Delete all bids first
        const bidDeleteResult = await bidCollection.deleteMany({
          product_id: new ObjectId(productId),
        });

        // Delete product
        const productDeleteResult = await productCollection.deleteOne({
          _id: new ObjectId(productId),
        });

        return res.status(200).json({
          message: "Product deleted successfully",
          deletedProductCount: productDeleteResult.deletedCount,
          deletedBidCount: bidDeleteResult.deletedCount,
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message: "Failed to delete product",
        });
      }
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
      const result = await productCollection
        .find(query)
        .sort({ created_at: -1 })
        .toArray();
      res.json(result);
    });

    /**
     *  GET /products/:id
     * */
    app.get("/products/:id", async (req, res) => {
      logger("GET /products/:id");

      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            message: "Invalid product id",
          });
        }

        const query = {
          _id: new ObjectId(id),
        };

        const product = await productCollection.findOne(query);

        if (!product) {
          return res.status(404).json({
            message: "Product not found",
          });
        }

        res.status(200).json(product);
      } catch (error) {
        logger(error);

        res.status(500).json({
          message: "Internal server error",
        });
      }
    });

    /**
     *  GET /my_products?user_id=...
     * */
    app.get("/my_products", varifyFirebaseToken, async (req, res) => {
      try {
        logger("GET /my_products");

        const { user_id } = req.query;

        if (!user_id) {
          return res.status(400).json({
            message: "user_id is required",
          });
        }

        if (!ObjectId.isValid(user_id)) {
          return res.status(400).json({
            message: "Invalid user_id",
          });
        }

        const products = await productCollection
          .find({
            seller_id: new ObjectId(user_id),
          })
          .sort({ created_at: -1 })
          .toArray();

        res.status(200).json(products);
      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Failed to fetch your products",
        });
      }
    });

    /**
     *  GET /latest-products
     * */
    app.get("/latest-products", async (req, res) => {
      logger("GET /latest-products");

      try {
        const products = await productCollection
          .find({ status: "pending" })
          .sort({ created_at: -1 })
          .limit(6)
          .toArray();

        res.status(200).json(products);
      } catch (error) {
        logger(error);

        res.status(500).json({
          message: "Failed to fetch latest products",
        });
      }
    });

    // ========================================================================
    // ---  BIDS  -------------------------------------------------------------
    // ========================================================================

    /**
     * POST /bids
     * */
    app.post("/bids", async (req, res) => {
      try {
        logger("POST /bids");

        const { buyer_id, product_id, bid_price } = req.body;

        if (!buyer_id || !product_id || bid_price === undefined) {
          return res.status(400).json({
            message: "buyer_id, product_id and bid_price are required",
          });
        }

        if (!ObjectId.isValid(buyer_id) || !ObjectId.isValid(product_id)) {
          return res.status(400).json({
            message: "Invalid buyer_id or product_id",
          });
        }

        if (typeof bid_price !== "number" || bid_price <= 0) {
          return res.status(400).json({
            message: "bid_price must be a positive number",
          });
        }

        const buyerObjectId = new ObjectId(buyer_id);
        const productObjectId = new ObjectId(product_id);

        const product = await productCollection.findOne({
          _id: productObjectId,
        });

        if (!product) {
          return res.status(404).json({
            message: "Product not found",
          });
        }

        if (product.seller_id.toString() === buyer_id) {
          return res.status(403).json({
            message: "You cannot bid on your own product",
          });
        }

        const highestBid = await bidCollection
          .find({ product_id: productObjectId })
          .sort({ bid_price: -1 })
          .limit(1)
          .toArray();

        const currentHighest = highestBid[0]?.bid_price || 0;

        if (bid_price <= currentHighest) {
          return res.status(400).json({
            message: `Bid must be higher than current highest bid (${currentHighest})`,
          });
        }

        const newBid = {
          buyer_id: buyerObjectId,
          product_id: productObjectId,
          bid_price,
          status: "pending",
          created_at: new Date(),
        };

        const result = await bidCollection.insertOne(newBid);

        return res.status(201).json({
          message: "Bid created successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error(error);

        return res.status(500).json({
          message: "Failed to create bid",
        });
      }
    });

    const getUsersByIds = async (ids) => {
      const objectIds = ids.map((id) => new ObjectId(id));

      return userCollection.find({ _id: { $in: objectIds } }).toArray();
    };

    /**
     * GET /products/:productID/bids
     * */
    app.get("/products/:productId/bids", async (req, res) => {
      try {
        const { productId } = req.params;

        if (!ObjectId.isValid(productId)) {
          return res.status(400).json({ message: "Invalid product ID" });
        }

        const bids = await bidCollection
          .find({ product_id: new ObjectId(productId) })
          .sort({ bid_price: -1 })
          .toArray();

        const buyerIds = [...new Set(bids.map((b) => b.buyer_id.toString()))];
        const buyers = await getUsersByIds(buyerIds);
        const buyersMap = new Map(buyers.map((b) => [b._id.toString(), b]));

        const enriched = bids.map((bid) => ({
          ...bid,
          buyer: buyersMap.get(bid.buyer_id.toString()),
        }));

        res.json(enriched);
      } catch (err) {
        res.status(500).json({ message: "Failed" });
      }
    });

    /**
     * GET /my_bids?user_id=...
     * */
    app.get("/my_bids", async (req, res) => {
      try {
        logger("GET /my_bids");

        const { user_id } = req.query;

        if (!user_id) {
          return res.status(400).json({
            message: "user_id is required",
          });
        }

        if (!ObjectId.isValid(user_id)) {
          return res.status(400).json({
            message: "Invalid user_id",
          });
        }

        const bids = await bidCollection
          .find({
            buyer_id: new ObjectId(user_id),
          })
          .sort({
            created_at: -1,
          })
          .toArray();

        const productIds = [
          ...new Set(bids.map((bid) => bid.product_id.toString())),
        ];

        const products = await productCollection
          .find({
            _id: {
              $in: productIds.map((id) => new ObjectId(id)),
            },
          })
          .toArray();

        const sellerIds = [
          ...new Set(products.map((product) => product.seller_id.toString())),
        ];

        const sellers = await userCollection
          .find({
            _id: {
              $in: sellerIds.map((id) => new ObjectId(id)),
            },
          })
          .toArray();

        const sellersMap = new Map(
          sellers.map((seller) => [seller._id.toString(), seller]),
        );

        const productsMap = new Map(
          products.map((product) => [
            product._id.toString(),
            {
              ...product,
              seller: sellersMap.get(product.seller_id.toString()),
            },
          ]),
        );

        const enrichedBids = bids.map((bid) => ({
          _id: bid._id,
          bid_price: bid.bid_price,
          status: bid.status,
          created_at: bid.created_at,

          product: productsMap.get(bid.product_id.toString()),
        }));

        res.status(200).json(enrichedBids);
      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Failed to fetch your bids",
        });
      }
    });

    /**
     * DELETE /bids/:bidId
     * */
    app.delete("/bids/:bidId", async (req, res) => {
      try {
        logger("DELETE /bids/:bidId");

        const { bidId } = req.params;
        const { user_id } = req.body;

        if (!ObjectId.isValid(bidId)) {
          return res.status(400).json({
            message: "Invalid bid ID",
          });
        }

        if (!user_id) {
          return res.status(400).json({
            message: "user_id is required",
          });
        }

        if (!ObjectId.isValid(user_id)) {
          return res.status(400).json({
            message: "Invalid user_id",
          });
        }

        const bid = await bidCollection.findOne({
          _id: new ObjectId(bidId),
        });

        if (!bid) {
          return res.status(404).json({
            message: "Bid not found",
          });
        }

        // Ownership check
        if (bid.buyer_id.toString() !== user_id) {
          return res.status(403).json({
            message: "You are not allowed to delete this bid",
          });
        }

        await bidCollection.deleteOne({
          _id: new ObjectId(bidId),
        });

        res.status(200).json({
          message: "Bid deleted successfully",
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          message: "Failed to delete bid",
        });
      }
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  logger(`It's alive on port: ${port}`);
});
