# CampusCart Database Schema

This document details the MongoDB schema, relationships, and indexing strategy for CampusCart.

---

## 1. User Collection
**Mongoose Model:** `User`

### Schema Fields
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `name` | `String` | Trim, Default: `""` |
| `avatar` | `String` | Default: `""` |
| `email` | `String` | Required, Unique, Lowercase, Trim, Match regex |
| `password` | `String` | Min length: 6, Select: `true` |
| `isVerified` | `Boolean` | Default: `false` |
| `verificationToken`| `String` | Select: `false` |
| `verificationTokenExpires`| `Date` | Select: `false` |
| `googleId` | `String` | Default: `null` |
| `githubId` | `String` | Default: `null` |
| `providers` | `[String]` | Default: `["email"]` |
| `createdAt` | `Date` | Automated timestamps |
| `updatedAt` | `Date` | Automated timestamps |

### Relationships
- None explicitly defined by `ref` fields, but extensively referenced by other collections.

### Indexes
- `email`: 1 (Unique)

### Sample Document
```json
{
  "_id": "60b8d295...",
  "name": "Jane Doe",
  "avatar": "https://example.com/avatar.jpg",
  "email": "jane@college.edu",
  "password": "$2b$12$hashedpassword... ",
  "isVerified": true,
  "googleId": null,
  "githubId": null,
  "providers": ["email"],
  "createdAt": "2023-10-15T10:00:00.000Z",
  "updatedAt": "2023-10-15T10:00:00.000Z"
}
```

---

## 2. Listing Collection
**Mongoose Model:** `Listing`

### Schema Fields
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `title` | `String` | Required, Trim, Max length: 100 |
| `description` | `String` | Required, Trim, Max length: 1000 |
| `price` | `Number` | Required, Min: 0 |
| `condition` | `String` | Required, Enum: `['new', 'like-new', 'good', 'fair', 'poor']` |
| `category` | `String` | Required, Enum, Indexed |
| `images` | `[Object]` | `[{ url: String, publicId: String }]` |
| `sellerId` | `ObjectId` | Required, Indexed, Ref: `User` |
| `status` | `String` | Enum: `['active', 'sold', 'reserved', 'removed']`, Default: `"active"`, Indexed |
| `isVerified` | `Boolean` | Default: `false` |

### Relationships
- `sellerId` ➡ **User**: Populates `name`, `avatar`

### Indexes
- `category`: 1
- `sellerId`: 1
- `status`: 1
- `{ category: 1, status: 1 }` (Compound)

### Sample Document
```json
{
  "_id": "60b8e2a1...",
  "title": "TI-84 Graphing Calculator",
  "description": "Mint condition calculator used for one semester.",
  "price": 60,
  "condition": "like-new",
  "category": "Electronics",
  "images": [
    {
      "url": "https://example.com/sample.jpg",
      "publicId": "sample123"
    }
  ],
  "sellerId": "60b8d295...",
  "status": "active",
  "isVerified": true,
  "createdAt": "2023-10-20T14:30:00.000Z",
  "updatedAt": "2023-10-20T14:30:00.000Z"
}
```

---

## 3. Offer Collection
**Mongoose Model:** `Offer`

### Schema Fields
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `listing` | `ObjectId` | Required, Indexed, Ref: `Listing` |
| `buyer` | `ObjectId` | Required, Indexed, Ref: `User` |
| `seller` | `ObjectId` | Required, Indexed, Ref: `User` |
| `amount` | `Number` | Required, Min: 0.01 |
| `message` | `String` | Max length: 500, Trim |
| `status` | `String` | Enum: `['pending', 'accepted', 'rejected']`, Default: `"pending"` |

### Relationships
- `listing` ➡ **Listing**: Populates `title`, `price`, `images`
- `buyer` ➡ **User**: Populates `name`, `avatar`, `email`
- `seller` ➡ **User**: Populates `name`, `avatar`, `email`

### Indexes
- `listing`: 1
- `buyer`: 1
- `seller`: 1
- `{ listing: 1, buyer: 1, status: 1 }` (Unique, partial filter for `status: "pending"`)
- `{ listing: 1, status: 1 }` (Compound)

### Sample Document
```json
{
  "_id": "60b8f411...",
  "listing": "60b8e2a1...",
  "buyer": "60b8c111...",
  "seller": "60b8d295...",
  "amount": 50,
  "message": "Would you take 50?",
  "status": "pending",
  "createdAt": "2023-10-21T09:15:00.000Z",
  "updatedAt": "2023-10-21T09:15:00.000Z"
}
```

---

## 4. Conversation Collection
**Mongoose Model:** `Conversation`

### Schema Fields
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `participants` | `[ObjectId]` | Required (Array length exactly 2), Ref: `User` |
| `listing` | `ObjectId` | Required, Indexed, Ref: `Listing` |
| `offer` | `ObjectId` | Ref: `Offer` |
| `lastMessage` | `String` | - |
| `lastMessageAt` | `Date` | - |
| `isActive` | `Boolean` | Default: `true` |

### Relationships
- `participants` ➡ **User**: Populates `name`, `avatar`
- `listing` ➡ **Listing**: Populates `title`, `price`, `images[0]`
- `offer` ➡ **Offer**

### Indexes
- `listing`: 1
- `{ participants: 1, lastMessageAt: -1 }` (Compound)

### Sample Document
```json
{
  "_id": "60b9a123...",
  "participants": [
    "60b8c111...",
    "60b8d295..."
  ],
  "listing": "60b8e2a1...",
  "offer": "60b8f411...",
  "lastMessage": "Sounds good, where should we meet?",
  "lastMessageAt": "2023-10-21T10:20:00.000Z",
  "isActive": true,
  "createdAt": "2023-10-21T09:15:00.000Z",
  "updatedAt": "2023-10-21T10:20:00.000Z"
}
```

---

## 5. Message Collection
**Mongoose Model:** `Message`

### Schema Fields
| Field | Type | Attributes |
| :--- | :--- | :--- |
| `conversation` | `ObjectId` | Required, Indexed, Ref: `Conversation` |
| `sender` | `ObjectId` | Required, Ref: `User` |
| `text` | `String` | Required, Max: 1000 |
| `type` | `String` | Enum: `['text', 'offer']`, Default: `"text"` |
| `read` | `Boolean` | Default: `false` |

### Relationships
- `conversation` ➡ **Conversation**
- `sender` ➡ **User**: Populates `name`, `avatar`

### Indexes
- `conversation`: 1
- `{ conversation: 1, createdAt: 1 }` (Compound)

### Sample Document
```json
{
  "_id": "60b9c345...",
  "conversation": "60b9a123...",
  "sender": "60b8c111...",
  "text": "Sounds good, where should we meet?",
  "type": "text",
  "read": false,
  "createdAt": "2023-10-21T10:20:00.000Z",
  "updatedAt": "2023-10-21T10:20:00.000Z"
}
```
