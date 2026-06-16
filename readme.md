# Real-Time Whiteboard Application

## Overview

A full-stack collaborative whiteboard application built using React, Node.js, Express, MongoDB, and JWT Authentication.

Users can create multiple whiteboards, draw on a canvas, save changes, load previous boards, and manage their boards securely through authentication.

---

# Features

## Authentication

* User Registration
* User Login
* JWT Authentication
* Protected Routes
* Logout Functionality
* User-specific Board Access

## Whiteboard

* Freehand Drawing
* Shape Drawing
* Text Tool
* Eraser Tool
* Undo / Redo
* Board Saving
* Board Loading
* Board Deletion
* Multiple Board Support

## Board Management

* Create Board
* View All User Boards
* Open Board by URL
* Delete Board
* Persistent Storage in MongoDB

## Routing

* Login Page
* Register Page
* Whiteboard Dashboard
* Dynamic Board Routes

Example:

/login

/register

/board/:id

---

# Tech Stack

## Frontend

* React
* React Router DOM
* HTML5 Canvas
* Axios

## Backend

* Node.js
* Express.js
* JWT Authentication
* BcryptJS

## Database

* MongoDB Atlas
* Mongoose

---

# Project Structure

## Frontend

frontend/

├── src/

│ ├── api/

│ │ ├── authApi.js

│ │ └── boardApi.js

│ │

│ ├── components/

│ │ └── Canvas.jsx

│ │

│ ├── pages/

│ │ ├── Login.jsx

│ │ └── Register.jsx

│ │

│ ├── App.jsx

│ └── main.jsx

---

## Backend

backend/

├── controllers/

│ ├── authController.js

│ └── boardController.js

│

├── middleware/

│ └── authMiddleware.js

│

├── models/

│ ├── User.js

│ └── Board.js

│

├── routes/

│ ├── authRoutes.js

│ └── boardRoutes.js

│

├── config/

│ └── db.js

│

└── server.js

---

# Database Schema

## User

```javascript
{
  name: String,
  email: String,
  password: String
}
```

## Board

```javascript
{
  title: String,
  elements: Array,
  owner: ObjectId
}
```

# API Endpoints

## Authentication

### Register

POST /api/auth/register

```json
{
  "name": "Raman",
  "email": "raman@gmail.com",
  "password": "12345678"
}
```

### Login

POST /api/auth/login

```json
{
  "email": "raman@gmail.com",
  "password": "12345678"
}
```

Response:

```json
{
  "token": "JWT_TOKEN"
}
```

# Board APIs

### Create Board

POST /api/boards

### Get User Boards

GET /api/boards

### Get Board By Id

GET /api/boards/:id

### Update Board

PUT /api/boards/:id

### Delete Board

DELETE /api/boards/:id

# Authentication Flow

Register

↓

Login

↓

JWT Token Generated

↓

Token Stored in Local Storage

↓

Protected API Access

# Whiteboard Flow

Create Board

↓

Navigate to

/board/:id

↓

Draw Elements

↓

Save Board

↓

MongoDB Storage

↓

Reload Anytime

# Environment Variables

Create a .env file inside backend.

```env
PORT=5000

DB_CONNECT_STRING=your_mongodb_connection_string

JWT_SECRET=your_secret_key
```

# Installation

## Backend

```bash
cd backend

npm install

npm run dev
```

## Frontend

```bash
cd frontend

npm install

npm run dev
```

# Future Improvements

* Socket.IO Real-Time Collaboration
* Redis Token Blacklisting
* Rate Limiting
* Board Sharing
* Board Rename Feature
* Export Board as Image
* Team Collaboration
* Board Permissions

# Author

Raman Kumar

Full Stack Whiteboard Application Project
