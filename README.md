# Full-Stack Trello Clone

A full-stack project management application inspired by Trello, built with the MERN stack (MongoDB, Express.js, React, Node.js).

## 🚀 Features

- **Board Management**: Create, view, and manage project boards seamlessly.
- **Task Organization**: Add and organize tasks efficiently.
- **RESTful API**: Robust backend architecture built with Express.js and MongoDB.
- **Responsive Frontend**: Modern UI built with React and Vite for smooth user experience.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, JavaScript, CSS
- **Backend**: Node.js, Express.js (CommonJS setup via `.cjs`), MongoDB, Mongoose
- **Environment**: Alpine Linux / Acode Development Environment

## 📁 Project Structure

```text
Trello-Clone/
├── backend/              # Node.js / Express Backend API
│   ├── controllers/      # Route controllers
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API endpoints
│   ├── node_modules/     # Backend dependencies
│   ├── app.js            # Express setup
│   ├── server.cjs        # Main server entry point (Port 5000)
│   └── test.cjs          # API testing script
│
├── frontend/             # React / Vite Frontend Application
│   ├── src/              # React components & styling
│   ├── public/           # Static assets
│   ├── node_modules/     # Frontend dependencies
│   ├── index.html        # HTML entry point
│   └── vite.config.js    # Vite configuration
│
├── .gitignore            # Git ignore rules
└── README.md             # Project Documentation
⚙️ Getting Started Locally
1. Clone the Repository
git clone [https://github.com/matiur25580/Trello-Clone.git](https://github.com/matiur25580/Trello-Clone.git)
cd Trello-Clone

2. Setup Backend
cd backend
npm install

 * Create a .env file inside the backend/ directory:
   PORT=5000
MONGO_URI=your_mongodb_connection_string

 * Run the server:
   node server.cjs

3. Setup Frontend
cd ../frontend
npm install
npm run dev

💡 Author
Matiur Rahman (matiur25580)

---

