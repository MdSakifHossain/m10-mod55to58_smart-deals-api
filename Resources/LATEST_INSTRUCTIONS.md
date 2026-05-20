# SMART DEALS — API Specification

A Local Online Marketplace for Buying & Selling with Bids

---

## Tech Stack

| Layer    | Technology              |
| -------- | ----------------------- |
| Frontend | React / HTML+CSS+JS     |
| Backend  | Node.js + Express       |
| Database | MongoDB (NoSQL)         |
| Auth     | Firebase Authentication |
| API      | RESTful                 |

---

## Database Collections

### 1. `Users` Collection

| Field           | Type         | Description                    |
| --------------- | ------------ | ------------------------------ |
| `_id`           | ObjectId     | Auto-generated ID              |
| `firebase_uid`  | String       | From Firebase `user.uid`       |
| `user_name`     | String       | Full name                      |
| `user_image`    | String (URL) | Profile pic                    |
| `user_location` | String       | Location                       |
| `user_phone`    | String       | Phone Number                   |
| `user_email`    | String       | Email                          |
| `created_at`    | ISODate      | `new Date()` (injected by API) |

### 2. `Products` Collection

| Field         | Type         | Description                             |
| ------------- | ------------ | --------------------------------------- |
| `_id`         | ObjectId     | Auto-generated ID                       |
| `seller_id`   | ObjectId     | Reference to `Users._id`                |
| `title`       | String       | Item name                               |
| `description` | String       | Full details                            |
| `image`       | String (URL) | Item photo                              |
| `status`      | String       | `pending` / `sold`                      |
| `price_min`   | Number       | Minimum acceptable price                |
| `category`    | String       | Example shown in `json/categories.json` |
| `condition`   | String       | `fresh` / `used`                        |
| `usage`       | String       | e.g., "6 months old"                    |
| `created_at`  | ISODate      | `new Date()` (injected by API)          |

### 3. `Bids` Collection

| Field        | Type     | Description                    |
| ------------ | -------- | ------------------------------ |
| `_id`        | ObjectId | Unique bid ID                  |
| `buyer_id`   | ObjectId | Reference to `Users._id`       |
| `product_id` | ObjectId | Reference to `Products._id`    |
| `status`     | String   | `pending` / `confirmed`        |
| `bid_price`  | Number   | Offered amount                 |
| `created_at` | ISODate  | `new Date()` (injected by API) |

---

## API Endpoints

### **Users Endpoints**

| Method | Endpoint    | Auth | Description                       |
| ------ | ----------- | ---- | --------------------------------- |
| `POST` | `/users`    | No   | Create user after Firebase signup |
| `GET`  | `/users/me` | Yes  | Get my profile                    |

**`POST /users` Request:**

```json
{
  "firebase_uid": "AaBbCcDd123",
  "user_name": "Rahim Ahmed",
  "user_email": "rahim@example.com",
  "user_image": "https://...",
  "user_phone": "01712345678",
  "user_location": "Dhaka"
}
```

**`GET /users/me` Response:**

```json
{
  "_id": "507f1f77...",
  "user_name": "Rahim Ahmed",
  "user_email": "rahim@example.com",
  "user_image": "https://...",
  "user_phone": "01712345678",
  "user_location": "Dhaka",
  "created_at": "2026-05-20T..."
}
```

---

### **Products Endpoints**

| Method   | Endpoint               | Auth | Description                                      |
| -------- | ---------------------- | ---- | ------------------------------------------------ |
| `GET`    | `/products`            | No   | Get all ads (optionally filter by `?seller_id=`) |
| `GET`    | `/products/:id`        | No   | Get single ad                                    |
| `POST`   | `/products`            | Yes  | Create new ad                                    |
| `PUT`    | `/products/:id`        | Yes  | Update my ad                                     |
| `DELETE` | `/products/:id`        | Yes  | Delete my ad (+ auto-delete its bids)            |
| `PATCH`  | `/products/:id/status` | Yes  | Change status: `sold` or `pending`               |

**`POST /products` Request** (Auth required — `seller_id` auto-injected):

```json
{
  "title": "iPhone 13",
  "description": "Used 6 months",
  "image": "https://...",
  "price_min": 500,
  "category": "Electronics",
  "condition": "used",
  "usage": "6 months"
}
```

**`PUT /products/:id` Request:** Same fields as POST, any subset.

**`PATCH /products/:id/status` Request:**

```json
{ "status": "sold" }
```

---

### **Bids Endpoints**

| Method   | Endpoint            | Auth | Description                                          |
| -------- | ------------------- | ---- | ---------------------------------------------------- |
| `GET`    | `/bids`             | Yes  | Get all bids I placed                                |
| `GET`    | `/bids/product/:id` | Yes  | Get bids on my product                               |
| `POST`   | `/bids`             | Yes  | Place a new bid                                      |
| `DELETE` | `/bids/:id`         | Yes  | Delete my bid                                        |
| `PATCH`  | `/bids/:id/accept`  | Yes  | Accept bid → auto-sells product + deletes other bids |

**`POST /bids` Request** (Auth required — `buyer_id` auto-injected):

```json
{
  "product_id": "507f1f77...",
  "bid_price": 520
}
```

**`PATCH /bids/:id/accept`** — Empty body. Backend handles everything:

1. Marks this bid `confirmed`
2. Marks product `sold`
3. Deletes all other bids on this product

---

## User Flow Example

```text
1. Signup with Firebase → get firebase_uid
   → POST /users (create MongoDB record)

2. Login with Firebase → get id_token
   → Use token in all future requests

3. Seller posts "iPhone 13 - Used - $500"
   → POST /products (backend injects seller_id)

4. Buyer 1 bids $510
   → POST /bids (backend injects buyer_id)

5. Buyer 2 bids $530
   → POST /bids

6. Seller accepts Buyer 2
   → PATCH /bids/{bidId}/accept
   → (backend auto: product sold + other bids deleted)
```

---

## Frontend Pages → API Mapping

| Page                | API Calls                                     |
| ------------------- | --------------------------------------------- |
| **Home**            | `GET /products`                               |
| **Register**        | Firebase Auth → `POST /users`                 |
| **Login**           | Firebase Auth only                            |
| **All-Products**    | `GET /products`                               |
| **My-Products**     | `GET /products?seller_id=<my_id>`             |
| **My Bids**         | `GET /bids`                                   |
| **Product Details** | `GET /products/:id` + `GET /bids/product/:id` |
| **Post Products**   | `POST /products`                              |
| **Update Products** | `PUT /products/:id`                           |

---

## Auth Rule

**Send Firebase token in every request header:**

```js
Authorization: Bearer <firebase_id_token>
```

The API verifies the token, finds your `Users._id`, and uses it as `seller_id` or `buyer_id`. **Never send these IDs from the frontend.**

---

## License

MIT © SMART DEALS
