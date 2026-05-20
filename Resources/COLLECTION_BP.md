# Database Collection Blueprint

## `Users` Collection (User Info)

| Field           | Type         | Description                               |
| --------------- | ------------ | ----------------------------------------- |
| `_id`           | ObjectId     | Auto-generated ID                         |
| `firebase_uid`  | String       | get it from the `user` object of firebase |
| `user_name`     | String       | Full name                                 |
| `user_image`    | String (URL) | Profile pic                               |
| `user_location` | String       | Location                                  |
| `user_phone`    | String       | Phone Number                              |
| `user_email`    | String       | Email                                     |
| `created_at`    | ISODate      | `new Date()` (on the API)                 |

---

## `Products` Collection (Product Info)

| Field         | Type         | Description                                      |
| ------------- | ------------ | ------------------------------------------------ |
| `_id`         | ObjectId     | Auto-generated ID                                |
| `seller_id`   | ObjectId     | Reference to `Users._id`                         |
| `title`       | String       | Item name                                        |
| `description` | String       | Full details                                     |
| `image`       | String (URL) | Item photo                                       |
| `status`      | String       | `pending` / `sold`                               |
| `price_min`   | Number       | Minimum acceptable price                         |
| `category`    | String       | Example shown in the `json/categories.json` file |
| `condition`   | String       | `fresh` / `used`                                 |
| `usage`       | String       | e.g., "6 months old"                             |
| `created_at`  | ISODate      | Timestamp of posting `new Date()` (on the API)   |

---

## `Bids` Collection (Buyer Offers)

| Field        | Type     | Description                 |
| ------------ | -------- | --------------------------- |
| `_id`        | ObjectId | Unique bid ID               |
| `buyer_id`   | ObjectId | Reference to `Users._id`    |
| `product_id` | ObjectId | Reference to `Products._id` |
| `status`     | String   | `pending` / `confirmed`     |
| `bid_price`  | Number   | Offered amount              |
| `created_at` | ISODate  | `new Date()` (on the API)   |

---
