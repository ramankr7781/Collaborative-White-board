# Collaborative Whiteboard

A **real-time collaborative whiteboard application** built with the **MERN stack** and **Socket.IO**, designed for multi-user drawing, board sharing, access control, and live collaboration.

Users can create boards, draw in real time with others, invite members, manage access requests, use multiple whiteboard tools, and collaborate with live cursors and online presence.

---

## Features

### Authentication & User Management
- User registration and login
- JWT-based authentication
- Protected routes
- Logout support
- Persistent user session using local storage

### Board Management
- Create whiteboards
- Save and load boards
- Delete boards
- Board title management
- Board ownership support

### Whiteboard Tools
- Pen / freehand drawing
- Eraser
- Text tool
- Line tool
- Arrow tool
- Rectangle tool
- Square tool
- Circle tool
- Select tool for element selection

### Editing Features
- Move selected elements
- Resize selected elements
- Delete selected elements
- Undo / Redo
- Clear board

### Shape Fill Support
- Fill color for:
  - Rectangle
  - Square
  - Circle

### Import / Export
- Export board as PNG
- Export board as JSON
- Import board from JSON

### Collaboration Features
- Real-time multi-user drawing with Socket.IO
- Live cursor tracking with user names
- Online users count
- Shared board access through invite / request system

### Access Control
- Invite members by email
- Request board access
- Approve / reject access requests
- View board members
- Remove members
- Owner-based access management

---

## Tech Stack

### Frontend
- React
- React Router
- Axios
- HTML5 Canvas
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.IO
- JWT Authentication
- Bcrypt
- Redis
- Helmet
- Express Rate Limiter

### Deployment
- Frontend: Vercel
- Backend: Render / Railway
- Database: MongoDB Atlas

---

## Project Structure

```bash
Collaborative-Whiteboard/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── authApi.js
│   │   │   └── boardApi.js
│   │   ├── components/
│   │   │   └── Canvas.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Home.jsx
│   │   ├── socket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── redis.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

## System Design Overview

### 1. Authentication Flow
- Users register and log in using email/password.
- Backend verifies credentials and issues a JWT.
- Token is stored in local storage and attached to protected API requests.

### 2. Board Access Flow
- Board owner can invite members.
- Non-members can request access to a board.
- Owner can approve or reject access requests.
- Only owners and approved members can join and collaborate on a board.

### 3. Real-Time Collaboration Flow
- User opens a board and joins a Socket.IO room based on board ID.
- Whiteboard events such as drawing, moving, resizing, deleting, clearing, and cursor movement are broadcast to other members in the same room.
- Online user count is tracked per board room.

### 4. Whiteboard Rendering
- Whiteboard is rendered on an HTML5 canvas.
- Elements are stored as structured objects and re-rendered from state.
- Supported element types include strokes, shapes, and text.
- Shape fill support is handled during canvas rendering.

---

## Screens / Core Pages

- **Login Page**
- **Register Page**
- **Board Dashboard**
- **Collaborative Whiteboard Canvas**
- **Invite / Members / Access Requests Controls**

---

## Installation & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Backend Setup
Go to the backend folder:

```bash
cd backend
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=PORT_NUMBER
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup
Go to the frontend folder:

```bash
cd frontend
npm install
```

Create a `.env` file inside the frontend folder:

```env
VITE_API_URL=http://localhost:PORT_NUMBER/api
VITE_SOCKET_URL=http://localhost:PORT_NUMBER
```

Start the frontend:

```bash
npm run dev
```

### 4. Open the app
Frontend should run on:

```bash
http://localhost:5173
```

Backend should run on:

```bash
http://localhost:PORT_NUMBER
```

---

## Environment Variables

### Backend `.env`
| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `CLIENT_URL` | Frontend URL allowed in CORS |

### Frontend `.env`
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL |
| `VITE_SOCKET_URL` | Backend Socket.IO server URL |

---

## API Overview

### Auth Routes
- `POST /api/auth/register` → Register user
- `POST /api/auth/login` → Login user
- `POST /api/auth/logout` → Logout user

### Board Routes
- `POST /api/boards` → Create board
- `GET /api/boards` → Get all boards of user
- `GET /api/boards/:id` → Get a board by ID
- `PUT /api/boards/:id` → Update board
- `DELETE /api/boards/:id` → Delete board

### Collaboration / Access Routes
- `POST /api/boards/:boardId/invite` → Invite member
- `POST /api/boards/:boardId/request-access` → Request access
- `GET /api/boards/:boardId/requests` → Get access requests
- `POST /api/boards/requests/:requestId/approve` → Approve request
- `POST /api/boards/requests/:requestId/reject` → Reject request
- `GET /api/boards/:boardId/members` → Get board members
- `DELETE /api/boards/:boardId/members/:memberId` → Remove member

---

## Socket Events

### Client → Server
- `join-board`
- `drawing`
- `clear-board`
- `move-element`
- `resize-element`
- `update-elements`
- `delete-element`
- `cursor-move`

### Server → Client
- `board-state`
- `drawing`
- `clear-board`
- `move-element`
- `resize-element`
- `update-elements`
- `delete-element`
- `cursor-move`
- `cursor-remove`
- `users-count`
- `board-access-denied`

---

## Whiteboard Element Model

Examples of element types stored on the board:

- **Freehand stroke**
- **Line**
- **Arrow**
- **Rectangle**
- **Square**
- **Circle**
- **Text**

Each element stores data such as:
- `id`
- `type`
- `color`
- `size`
- coordinates / points
- optional fill information for supported shapes

---

## Security Features

- JWT-based authentication
- Password hashing using bcrypt
- Helmet for secure HTTP headers
- Rate limiting on auth routes
- Redis integration for logout/session handling
- Access-controlled board joining for Socket.IO rooms

---

## Deployment Plan

### Frontend
Deploy on **Vercel**

### Backend
Deploy on **Render** or **Railway**

### Database
Use **MongoDB Atlas**

### Production Environment Variables

#### Frontend
```env
VITE_API_URL=https://your-backend-domain/api
VITE_SOCKET_URL=https://your-backend-domain
```

#### Backend
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret
CLIENT_URL=https://your-frontend-domain
```

---

## Future Improvements
Possible enhancements for the project:
- Email verification / OTP-based auth
- Board thumbnails / recent activity
- More advanced whiteboard tools
- Real-time chat inside board
- Version history / board snapshots
- Mobile responsiveness improvements
- Better cursor styling and presence indicators
- Team / workspace support

---

## Learning Outcomes
This project helped in understanding and implementing:
- MERN stack full-stack development
- JWT authentication and protected APIs
- Real-time communication with Socket.IO
- HTML5 Canvas rendering and whiteboard logic
- Board-level access control and collaboration workflows
- Import/export handling for structured whiteboard data
- Deployment-ready environment configuration

---

## Author
**Raman Kumar**

- B.Tech CSE, NIT Jamshedpur
- LeetCode: `mahi_raman7`
- LinkedIn: `raman-kumar-63064230b`
- GitHub: `ramankr7781`

---

## License
This project is for learning, collaboration, and portfolio/demo purposes.
