from fastapi import FastAPI, HTTPException, BackgroundTasks # type: ignore
from pydantic import BaseModel # type: ignore
import psycopg # type: ignore
from psycopg.rows import dict_row # type: ignore
import os
import boto3 # type: ignore
from dotenv import load_dotenv # type: ignore
from openai import OpenAI # type: ignore
import pypdf # type: ignore
import io

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

app = FastAPI()

# Initialize Clients
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- HELPER FUNCTIONS (The Logic) ---

def get_db_connection():
    return psycopg.connect(
        os.getenv("DATABASE_URL"),
        row_factory=dict_row,
        autocommit=True
    )

def download_from_s3(file_key):
    print(f"📥 Downloading {file_key} from S3...")
    try:
        response = s3_client.get_object(Bucket=os.getenv("AWS_BUCKET_NAME"), Key=file_key)
        return response['Body'].read()
    except Exception as e:
        print(f"❌ S3 Error: {e}")
        raise e

def extract_text_from_file(file_bytes, file_key):
    print(f"📄 Extracting text from {file_key}...")
    
    # Check if it's a PDF
    if file_key.lower().endswith('.pdf'):
        try:
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"⚠️ PDF Error: {e}")
            return ""
            
    # Otherwise, assume it's a Text file
    else:
        try:
            return file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            # Fallback for weird text encodings
            return file_bytes.decode('latin-1')

def chunk_text(text, chunk_size=1000, overlap=200):
    print(f"✂️ Chunking text (Size: {chunk_size}, Overlap: {overlap})...")
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        # Move forward, but back up a bit for overlap
        start = end - overlap
    print(f"✅ Created {len(chunks)} chunks.")
    return chunks

def generate_embedding(text):
    # Call OpenAI to get the vector
    response = openai_client.embeddings.create(
        input=text,
        model="text-embedding-3-small"
    )
    return response.data[0].embedding

def extract_graph_from_text(text, document_id, conn):
    print("🕸️ Extracting Knowledge Graph...")
    
    # We ask GPT to act as a Data Scientist
    prompt = f"""
    Extract key entities and relationships from the text below.
    Return JSON format:
    {{
        "nodes": [{{"label": "Entity Name", "type": "Person/Org/Location"}}],
        "edges": [{{"source": "Entity Name", "target": "Entity Name", "relationship": "WORKS_FOR/LOCATED_IN"}}],
    }}
    
    TEXT:
    {text[:4000]}  # Limit text to fit context window
    """

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo-0125", # Cheaper model is fine for extraction
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        data = response.choices[0].message.content
        import json
        graph_data = json.loads(data)
        
        # Save Nodes
        node_map = {} # Maps "Label" -> UUID
        for node in graph_data.get('nodes', []):
            cur = conn.execute(
                """
                INSERT INTO nodes (document_id, label, type) 
                VALUES (%s, %s, %s) 
                ON CONFLICT (document_id, label) DO UPDATE SET type = EXCLUDED.type
                RETURNING id;
                """,
                (document_id, node['label'], node['type'])
            )
            node_id = cur.fetchone()['id']
            node_map[node['label']] = node_id
            
        # Save Edges
        for edge in graph_data.get('edges', []):
            source_id = node_map.get(edge['source'])
            target_id = node_map.get(edge['target'])
            
            if source_id and target_id:
                conn.execute(
                    """
                    INSERT INTO edges (document_id, source_node_id, target_node_id, relationship)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (document_id, source_id, target_id, edge['relationship'])
                )
        
        print(f"✅ Extracted {len(graph_data.get('nodes', []))} nodes and {len(graph_data.get('edges', []))} edges.")
        
    except Exception as e:
        print(f"⚠️ Graph Extraction Error: {e}")

def process_file_logic(file_key: str, document_id: str):
    """
    The Main Worker Function.
    Downloads -> Extracts -> Chunks -> Embeds -> Saves.
    """
    conn = get_db_connection()
    try:
        # 1. Update Status to PROCESSING
        conn.execute("UPDATE documents SET status = 'PROCESSING' WHERE id = %s", (document_id,))
        
        # 2. Download from S3
        file_bytes = download_from_s3(file_key)
        
        # 3. Extract Text (Smartly handling PDF or TXT)
        full_text = extract_text_from_file(file_bytes, file_key)
        
        if not full_text.strip():
            raise Exception("No text could be extracted from this file.")

        # 4. Chunk
        chunks = chunk_text(full_text)
        
        # 5. Embed & Save (Loop through chunks)
        print("🧠 Generating Embeddings...")
        for i, chunk in enumerate(chunks):
            embedding = generate_embedding(chunk)
            
            # Save to Postgres Vector Table
            conn.execute(
                """
                INSERT INTO embeddings (document_id, content, embedding)
                VALUES (%s, %s, %s)
                """,
                (document_id, chunk, embedding)
            )
            print(f"   Saved chunk {i+1}/{len(chunks)}")

        # 6. NEW: Extract Graph Structure
        extract_graph_from_text(full_text, document_id, conn)

        # 7. Mark Complete (Renumbered)
        conn.execute("UPDATE documents SET status = 'COMPLETED' WHERE id = %s", (document_id,))
        print(f"🎉 Document {document_id} processing complete!")

    except Exception as e:
        print(f"❌ Processing Failed: {e}")
        conn.execute("UPDATE documents SET status = 'FAILED' WHERE id = %s", (document_id,))
    finally:
        conn.close()

# --- API ENDPOINTS ---

class ProcessRequest(BaseModel):
    file_key: str
    document_id: str

@app.post("/process")
async def process_document(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Receives a request to process a file.
    Offloads the heavy work to a Background Task so it doesn't block.
    """
    # Verify DB connection first
    conn = get_db_connection()
    conn.close()
    
    # Add to background queue (Fire and Forget)
    background_tasks.add_task(process_file_logic, request.file_key, request.document_id)
    
    return {"status": "processing_started", "file_key": request.file_key}

@app.get("/")
def health_check():
    return {"status": "ready"}

if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)