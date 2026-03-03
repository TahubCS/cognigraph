# CogniGraph

**CogniGraph** is a Graph-Enhanced Retrieval-Augmented Generation (RAG) platform that allows users to upload documents, extract structured knowledge, visualize relationships, and interact with an AI assistant grounded strictly in uploaded content.

Unlike traditional AI chat systems that rely on general model memory, CogniGraph ensures responses are context-aware and derived from your documents.

---

## 🚀 Features

* 📄 **Document Upload**

  * Upload PDFs or text-based documents for processing.

* 🧠 **Knowledge Extraction**

  * Automatically extracts entities, key concepts, and relationships.

* 🕸️ **Interactive Graph Visualization**

  * Explore document knowledge through an interactive graph interface.

* 💬 **Contextual AI Chat**

  * Ask questions and receive answers grounded in your uploaded files.

* 🔎 **Retrieval-Augmented Generation (RAG)**

  * Combines vector search with LLM reasoning for accurate, context-based responses.

---

## 🏗️ Architecture Overview

CogniGraph consists of two main components:

### 1️⃣ Frontend (Next.js + TypeScript)

* Handles user interface
* Document uploads
* Chat interface
* Graph visualization
* API communication with backend

### 2️⃣ Python Backend Service

* Document processing
* Text chunking & embedding generation
* Vector storage
* Knowledge extraction
* AI response generation
* API endpoints for frontend integration

---

## 📂 Project Structure

```
cognigraph/
│
├── public/                 # Static frontend assets
├── src/                    # Next.js frontend application
├── python_service/         # Backend Python service
│   ├── app.py              # API entry point
│   ├── requirements.txt    # Python dependencies
│   └── ...
│
├── package.json            # Frontend dependencies
├── tsconfig.json           # TypeScript configuration
├── README.md               # Project documentation
└── .gitignore
```

---

## 🛠️ Installation & Setup

### 🔹 Prerequisites

Make sure you have:

* Node.js (v18 or higher)
* npm or yarn
* Python (3.9 or higher)
* pip
* Virtual environment tool (recommended)

---

## ▶️ Running Locally

### Step 1: Clone Repository

```bash
git clone https://github.com/TahubCS/cognigraph.git
cd cognigraph
```

---

### Step 2: Setup Python Backend

```bash
cd python_service

# Create virtual environment
python -m venv venv

# Activate environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python app.py
```

Backend will typically run on:

```
http://localhost:8000
```

---

### Step 3: Setup Frontend

```bash
cd ../

npm install
# or
yarn install

npm run dev
# or
yarn dev
```

Frontend runs at:

```
http://localhost:3000
```

---

## 🧠 How CogniGraph Works

1. User uploads a document.
2. Backend processes and splits the text into chunks.
3. Embeddings are generated and stored in a vector index.
4. Key entities and relationships are extracted.
5. A knowledge graph is constructed and displayed.
6. User queries are matched against relevant document chunks.
7. The AI generates a grounded answer using retrieved context.

---

## 📦 Production Build

### Frontend

```bash
npm run build
npm start
```

### Backend (Recommended for Production)

Use a production-grade server such as:

```bash
gunicorn app:app
```

or

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

---

## 🔐 Environment Variables

Create a `.env` file if required by your backend for:

```
OPENAI_API_KEY=your_key_here
VECTOR_DB_URL=your_vector_db_url
```

Ensure sensitive keys are never committed to version control.

---

## 🧪 Testing (Optional)

You can add tests inside a `tests/` directory and run using:

```bash
pytest
```

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Submit a Pull Request

---

## 📄 License

No license is currently specified.
Add a LICENSE file if you plan to open-source this project publicly.

---

## 📌 Summary

CogniGraph provides a powerful way to:

* Transform documents into structured knowledge
* Visualize relationships between concepts
* Interact with AI grounded in your own data

It bridges document intelligence with modern AI-driven interfaces through a graph-enhanced RAG architecture.

---

**Maintained by TahubCS**
