# SMART DEALS — API Specification (v2.0)

**Normalized Schema | Firebase Auth | Server-Injected Timestamps & IDs**

---

## Architecture Principles (Read This First)

| Principle | What It Means For You |
|-----------|----------------------|
| **Firebase owns identity** | Login/signup is Firebase's job. Your API only verifies the token. |
| **MongoDB owns application data** | Users, Products, Bids live here. Firebase `uid` links them. |
| **Backend owns trust** | Never send `seller_id`, `buyer_id`, or `created_at` from frontend. Backend extracts user from token and injects these. |
| **One call, one action** | Complex flows (like accepting a bid) are wrapped into single endpoints. Frontend makes 1 call, backend handles the cascade. |

---

## Authentication

Every protected endpoint requires:

```
Authorization: Bearer <firebase_id_token>
```

**Backend verifies this token with Firebase Admin SDK**, extracts `firebase_uid`, finds matching `Users._id`, and uses that as the authenticated user's identity.

---

## Users Endpoints

### `POST /users` — Create User Record
**When:** Immediately after Firebase Auth signup. Frontend has `firebase_uid`, `user_name`, `user_email` from Firebase.

**Auth:** None (first call, no token yet — or use Firebase token if you have it)

| Field | From | Required |
|-------|------|----------|
| `firebase_uid` | Firebase `user.uid` | Yes |
| `user_name` | Firebase `user.displayName` or form input | Yes |
| `user_email` | Firebase `user.email` | Yes |
| `user_image` | Firebase `user.photoURL` or default | No |
| `user_phone` | Form input | No |
| `user_location` | Form input | No |

**Request:**
```json
{
  "firebase_uid": "AaBbCcDdEeFfGg123456",
  "user_name": "Rahim Ahmed",
  "user_email": "rahim@example.com",
  "user_image": "https://lh3.googleusercontent.com/...",
  "user_phone": "01712345678",
  "user_location": "Dhaka"
}
```

**Backend injects:** `created_at: new Date()`

**Response 201:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "firebase_uid": "AaBbCcDdEeFfGg123456",
  "user_name": "Rahim Ahmed",
  "user_email": "rahim@example.com",
  "user_image": "https://lh3.googleusercontent.com/...",
  "user_phone": "01712345678",
  "user_location": "Dhaka",
  "created_at": "2026-05-20T13:45:00.000Z"
}
```

**Error 409:** `firebase_uid` already exists (user already registered).

---

### `GET /users/me` — Get My Profile
**When:** Loading navbar, profile page, or checking "who am I".

**Auth:** Required (`Authorization: Bearer <token>`)

**Backend:** Verifies token → gets `firebase_uid` → finds user → returns full record.

**Response 200:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "firebase_uid": "AaBbCcDdEeFfGg123456",
  "user_name": "Rahim Ahmed",
  "user_email": "rahim@example.com",
  "user_image": "https://lh3.googleusercontent.com/...",
  "user_phone": "01712345678",
  "user_location": "Dhaka",
  "created_at": "2026-05-20T13:45:00.000Z"
}
```

**Error 404:** User not found (token valid but no MongoDB record — means they skipped `POST /users`).

---

## Products Endpoints

### `GET /products` — List All Products
**When:** Home page, All-Products page.

**Auth:** Not required (public marketplace).

**Query params (optional):**
- `?seller_id=507f1f77...` — filter by seller
- `?category=Electronics` — filter by category
- `?status=pending` — filter by status (default shows all)
- `?search=iphone` — text search on title/description

**Response 200:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "seller_id": "507f1f77bcf86cd799439011",
    "title": "iPhone 13 Pro",
    "description": "Used for 6 months, battery health 92%",
    "image": "https://example.com/iphone.jpg",
    "status": "pending",
    "price_min": 500,
    "category": "Electronics",
    "condition": "used",
    "usage": "6 months",
    "created_at": "2026-05-18T10:00:00.000Z"
  }
]
```

**Note:** Only `seller_id` returned. If you need seller details, call `GET /users/me` for yourself, or fetch seller separately if you build public profiles later.

---

### `GET /products/:id` — Single Product
**When:** Product Details page.

**Auth:** Not required.

**Response 200:** Same shape as above, single object.

---

### `POST /products` — Create Listing
**When:** Post Products page.

**Auth:** Required.

**Frontend sends:**
```json
{
  "title": "iPhone 13 Pro",
  "description": "Used for 6 months...",
  "image": "https://example.com/iphone.jpg",
  "price_min": 500,
  "category": "Electronics",
  "condition": "used",
  "usage": "6 months"
}
```

**Backend injects:**
- `seller_id` → from token (your `Users._id`)
- `status` → `"pending"`
- `created_at` → `new Date()`

**Response 201:** Full product object with injected fields.

**Error 400:** Missing required fields (`title`, `price_min`).

---

### `PUT /products/:id` — Update Listing
**When:** Update Products page.

**Auth:** Required. **Backend checks:** `seller_id` from token must match product's `seller_id`. You can only edit your own ads.

**Frontend sends:** Any fields to update (same shape as POST, minus injected fields).

**Response 200:** Updated product.

**Error 403:** Not your product.

**Error 404:** Product not found.

---

### `DELETE /products/:id` — Delete Listing
**When:** My-Products page, delete button.

**Auth:** Required. Same ownership check as PUT.

**Backend cascade:** Also deletes all bids for this product (`DELETE /bids/product/:id` logic runs automatically).

**Response 200:**
```json
{ "deleted": true, "deleted_bids": 3 }
```

**Error 403:** Not your product.

---

### `PATCH /products/:id/status` — Change Status
**When:** Seller manually marks sold, or reactivates.

**Auth:** Required. Ownership check.

**Request:**
```json
{ "status": "sold" }
```
or
```json
{ "status": "pending" }
```

**Response 200:** Updated product.

**Error 400:** Invalid status (must be `pending` or `sold`).

---

## Bids Endpoints

### `GET /bids` — Get My Bids (as buyer)
**When:** My Bids page.

**Auth:** Required. Backend extracts `buyer_id` from token.

**Query params (optional):**
- `?product_id=507f1f77...` — filter by product

**Response 200:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439013",
    "buyer_id": "507f1f77bcf86cd799439011",
    "product_id": "507f1f77bcf86cd799439012",
    "bid_price": 520,
    "status": "pending",
    "created_at": "2026-05-19T14:30:00.000Z"
  }
]
```

---

### `GET /bids/product/:product_id` — Get Bids on My Product
**When:** Seller viewing bids on their item.

**Auth:** Required. Backend checks: token's user must be the `seller_id` of this product.

**Response 200:** Array of bids (same shape as above).

**Error 403:** Not your product.

---

### `POST /bids` — Place Bid
**When:** Product Details page, bid form.

**Auth:** Required.

**Frontend sends:**
```json
{
  "product_id": "507f1f77bcf86cd799439012",
  "bid_price": 520
}
```

**Backend injects:**
- `buyer_id` → from token
- `status` → `"pending"`
- `created_at` → `new Date()`

**Validation:** Backend checks product exists and is `pending`. Reject bids on `sold` items.

**Response 201:** Full bid object.

**Error 400:** Bid price below `price_min` (optional validation — your call).

**Error 409:** Product already sold.

---

### `DELETE /bids/:id` — Withdraw My Bid
**When:** My Bids page, cancel button.

**Auth:** Required. Backend checks: token's user must match bid's `buyer_id`.

**Response 200:**
```json
{ "deleted": true }
```

**Error 403:** Not your bid.

---

### `PATCH /bids/:id/accept` — Accept Bid (The Magic Endpoint)
**When:** Seller clicks "Accept Offer" on a bid.

**Auth:** Required. Backend checks: token's user must be the `seller_id` of the product this bid belongs to.

**What backend does (all in one transaction):**
1. Verify bid exists and is `pending`
2. Verify product belongs to authenticated seller
3. Update bid status → `"confirmed"`
4. Update product status → `"sold"`
5. Delete all other bids on this product (`status: "pending"`)

**Request:** Empty body. Just the `id` in URL.

**Response 200:**
```json
{
  "accepted_bid": {
    "_id": "507f1f77bcf86cd799439013",
    "buyer_id": "507f1f77bcf86cd799439011",
    "product_id": "507f1f77bcf86cd799439012",
    "bid_price": 520,
    "status": "confirmed",
    "created_at": "2026-05-19T14:30:00.000Z"
  },
  "product_updated": {
    "_id": "507f1f77bcf86cd799439012",
    "status": "sold"
  },
  "deleted_other_bids": 2
}
```

**Error 403:** Not your product's bid.

**Error 400:** Bid already confirmed / product already sold.

---

## Frontend Pages → API Mapping

| Page | API Calls |
|------|-----------|
| **Home / All-Products** | `GET /products` |
| **Register** | Firebase Auth → `POST /users` |
| **Login** | Firebase Auth only |
| **My-Products** | `GET /products?seller_id=<me>` (or filter client-side after `GET /users/me`) |
| **My Bids** | `GET /bids` |
| **Product Details** | `GET /products/:id` + `GET /bids/product/:id` (if seller) |
| **Post Products** | `POST /products` |
| **Update Products** | `PUT /products/:id` |
| **(Implicit) Accept Bid** | `PATCH /bids/:id/accept` |

---

## Error Standard

All errors return:

```json
{
  "error": true,
  "message": "Human readable description",
  "code": "PRODUCT_NOT_FOUND"
}
```

Common codes:
- `UNAUTHORIZED` — missing/invalid Firebase token
- `FORBIDDEN` — valid token, but not owner of this resource
- `NOT_FOUND` — resource doesn't exist
- `CONFLICT` — duplicate `firebase_uid`, bid on sold product, etc.
- `VALIDATION_ERROR` — missing required fields

---

## What You Build vs What You Don't

| You Build | You Skip (For Now) |
|-----------|-------------------|
| `POST /users` | `PATCH /users` — profile editing (add later if needed) |
| `GET /users/me` | `GET /users/:id` — public profiles (not Facebook) |
| All Products endpoints | `DELETE /users` — account deletion (out of scope) |
| All Bids endpoints | Admin endpoints — you're not building an admin panel |

---

## MongoDB Indexes You Need

```javascript
// Users
db.users.createIndex({ firebase_uid: 1 }, { unique: true })
db.users.createIndex({ user_email: 1 })

// Products
db.products.createIndex({ seller_id: 1 })
db.products.createIndex({ category: 1 })
db.products.createIndex({ status: 1 })
db.products.createIndex({ created_at: -1 }) // newest first

// Bids
db.bids.createIndex({ buyer_id: 1 })
db.bids.createIndex({ product_id: 1 })
db.bids.createIndex({ status: 1 })
```

---

## Checkpoint: Build Order

1. **Setup:** MongoDB connection, Firebase Admin SDK init
2. **Auth middleware:** Verify token, attach `req.user` (full user object from DB)
3. **`POST /users`** — registration flow
4. **`GET /users/me`** — verify auth works
5. **Products CRUD** — full flow with ownership checks
6. **Bids CRUD** — place, list, delete
7. **`PATCH /bids/:id/accept`** — the cascade transaction
8. **Frontend wiring** — connect each page to its endpoint

---
