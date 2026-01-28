from fastapi import FastAPI, HTTPException, BackgroundTasks # type: ignore
from pydantic import BaseModel # type: ignore
import psycopg # type: ignore
from psycopg.rows import dict_row # type: ignore
# 🚀 ADDED: Connection Pool for scalability
from psycopg_pool import ConnectionPool # type: ignore
import os
import boto3 # type: ignore
from dotenv import load_dotenv # type: ignore
from openai import OpenAI # type: ignore
import pypdf # type: ignore
import io
import base64
import json
import logging

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

app = FastAPI()

# --- 🧠 DATABASE POOL (Scalable) ---
pool = ConnectionPool(
    conninfo=os.getenv("DATABASE_URL"),
    min_size=1,
    max_size=10,
    kwargs={"row_factory": dict_row, "autocommit": True}
)

@app.on_event("startup")
def open_pool():
    pool.open()

@app.on_event("shutdown")
def close_pool():
    pool.close()

# Initialize Clients
s3_client = boto3.client(
    "s3",
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION")
)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- 🧠 SMART STRATEGIES ---
# (Kept exactly as you had them, they are perfect)
STRATEGIES = {
    "legal": {
        "chunk_size": 2500,
        "chunk_overlap": 500,
        "system": "You are a Senior Legal Analyst. Extract entities related to contracts, laws, and compliance.",
        "nodes": ["Person", "Organization", "Contract", "Clause", "Statute", "Date", "Location"],
        "edges": ["SIGNED", "VIOLATES", "REFERENCES", "AMENDS", "LIABLE_FOR", "LOCATED_IN"],
        "prompt": "Analyze the text for legal relationships. Identify parties (Person/Org) and their obligations. Link Clauses to specific statutes or dates."
    },
    "financial": {
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "system": "You are a Wall Street Financial Analyst. Extract entities related to markets, earnings, and risk.",
        "nodes": ["Company", "Metric", "Currency", "Asset", "Risk", "Regulation"],
        "edges": ["REPORTED", "INCREASED", "DECREASED", "OWNS", "HEDGES_AGAINST", "COMPLIES_WITH"],
        "prompt": "Analyze the text for financial performance. Extract KPIs and map them to Companies."
    },
    "medical": {
        "chunk_size": 1200,
        "chunk_overlap": 250,
        "system": "You are a Chief Medical Officer. Extract clinical entities with high precision.",
        "nodes": ["Patient", "Symptom", "Condition", "Drug", "Treatment", "Dosage"],
        "edges": ["DIAGNOSED_WITH", "TREATED_WITH", "CAUSES", "PREVENTS", "CONTRAINDICATES"],
        "prompt": "Analyze the text for clinical relationships. Map Symptoms to Conditions. Link Treatments to Conditions."
    },
    "engineering": {
        "chunk_size": 1500,
        "chunk_overlap": 300,
        "system": "You are a Senior Staff Engineer. Extract technical architecture and dependencies.",
        "nodes": ["System", "Component", "Class", "Function", "API", "Database", "Service"],
        "edges": ["CALLS", "IMPORTS", "DEPENDS_ON", "RETURNS", "STORES_IN", "INHERITS_FROM"],
        "prompt": "Analyze the text for software architecture. Identify Components and their interactions. Highlight dependencies."
    },
    "sales": {
        "chunk_size": 800,
        "chunk_overlap": 150,
        "system": "You are a Sales Operations Manager. Extract customer needs and product fit.",
        "nodes": ["Client", "Product", "Feature", "PainPoint", "Requirement", "Competitor"],
        "edges": ["NEEDS", "PURCHASED", "COMPETES_WITH", "SOLVES", "REQUESTED"],
        "prompt": "Analyze the text for sales opportunities. Map Clients to Pain Points. Link Products to Requirements."
    },
    "regulatory": {
        "chunk_size": 2000,
        "chunk_overlap": 400,
        "system": "You are a Compliance Officer. Extract regulations and violations.",
        "nodes": ["Regulation", "Agency", "Policy", "Violation", "Standard", "Audit"],
        "edges": ["ENFORCES", "VIOLATES", "COMPLIES_WITH", "AUDITED_BY", "MANDATES"],
        "prompt": "Analyze the text for regulatory compliance. Link Agencies to Regulations. Identify internal Policies."
    },
    "journalism": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "system": "You are an Investigative Journalist. Extract the who, what, where, and when.",
        "nodes": ["Person", "Event", "Location", "Date", "Source", "Organization"],
        "edges": ["WITNESSED", "REPORTED", "OCCURRED_AT", "INVOLVED_IN", "QUOTED"],
        "prompt": "Analyze the text for factual reporting. Create a timeline of Events linked to Dates. Map People to Events."
    },
    "hr": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "system": "You are a Human Resources Director. Extract employee and policy info.",
        "nodes": ["Employee", "Role", "Department", "Policy", "Benefit", "Skill"],
        "edges": ["REPORTS_TO", "MEMBER_OF", "ELIGIBLE_FOR", "REQUIRES", "VIOLATES"],
        "prompt": "Analyze the text for organizational structure. Map Roles to Departments. Link Employees to Skills."
    },
    "general": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "system": "You are a Knowledge Graph Expert. Extract key entities and relationships.",
        "nodes": ["Person", "Organization", "Location", "Concept", "Event", "Object"],
        "edges": ["RELATED_TO", "PART_OF", "LOCATED_IN", "CREATED", "USES"],
        "prompt": "Extract key entities and relationships to build a general knowledge graph."
    }
}

# --- HELPER FUNCTIONS ---

def download_from_s3(file_key):
    logger.info(f"📥 Downloading {file_key} from S3...")
    response = s3_client.get_object(Bucket=os.getenv("AWS_BUCKET_NAME"), Key=file_key)
    return response['Body'].read()

def get_image_description(image_bytes, source_info="image"):
    logger.info(f"👁️ Analyzing visual content from {source_info}...")
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this image in detail for a knowledge base. If it contains text, charts, or diagrams, transcribe and summarize them accurately."},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}", "detail": "low"}},
                    ],
                }
            ],
            max_tokens=1000
        )
        return f"\n[IMAGE DESCRIPTION START ({source_info})]\n{response.choices[0].message.content}\n[IMAGE DESCRIPTION END]\n"
    except Exception as e:
        logger.error(f"⚠️ Vision Error: {e}")
        return ""

def extract_text_from_file(file_bytes, file_key):
    logger.info(f"📄 Extracting content from {file_key}...")
    file_ext = file_key.lower().split('.')[-1]
    
    # 1. PDF Handling
    if file_ext == 'pdf':
        try:
            pdf_reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page_num, page in enumerate(pdf_reader.pages):
                text += (page.extract_text() or "") + "\n"
                for img_index, img in enumerate(page.images):
                    if len(img.data) > 5000:
                        desc = get_image_description(img.data, f"Page {page_num+1} Image {img_index+1}")
                        text += desc
            return text
        except Exception as e:
            logger.error(f"⚠️ PDF Error: {e}")
            return ""
            
    # 2. Image Handling
    elif file_ext in ['jpg', 'jpeg', 'png', 'webp']:
        return get_image_description(file_bytes, f"Uploaded File: {file_key}")
        
    # 3. Code & Text Handling (Robust Fallback)
    else:
        try:
            # Try UTF-8 (Common for code/text)
            return file_bytes.decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Fallback to Latin-1 (Legacy text)
                return file_bytes.decode('latin-1')
            except Exception as e:
                logger.error(f"⚠️ Decoding Error: {e}")
                return ""

def chunk_text(text, chunk_size=1000, overlap=200):
    logger.info(f"✂️ Chunking text (Size: {chunk_size}, Overlap: {overlap})...")
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    logger.info(f"✅ Created {len(chunks)} chunks.")
    return chunks

def generate_embedding(text):
    response = openai_client.embeddings.create(input=text, model="text-embedding-3-small")
    return response.data[0].embedding

def extract_graph_from_text(text, document_id, conn, domain="general"):
    logger.info(f"🕸️ Extracting Knowledge Graph (Mode: {domain.upper()})...")
    
    strategy = STRATEGIES.get(domain, STRATEGIES["general"])
    
    prompt = f"""
    {strategy['system']}
    
    TASK:
    {strategy['prompt']}
    
    STRICT JSON OUTPUT FORMAT:
    {{
        "nodes": [{{"label": "Name", "type": "{'/'.join(strategy['nodes'])}"}}],
        "edges": [{{"source": "Name", "target": "Name", "relationship": "{'/'.join(strategy['edges'])}"}}],
    }}
    
    TEXT TO ANALYZE:
    {text[:6000]} 
    """

    try:
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        graph_data = json.loads(response.choices[0].message.content)
        
        # Save Nodes
        node_map = {}
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
            # Use fetchone() directly as row_factory=dict_row is set
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
        
        logger.info(f"✅ Extracted {len(graph_data.get('nodes', []))} nodes and {len(graph_data.get('edges', []))} edges.")
        
    except Exception as e:
        logger.error(f"⚠️ Graph Extraction Error: {e}")

def process_file_logic(file_key: str, document_id: str):
    # Get a connection from the pool
    with pool.connection() as conn:
        try:
            # 1. Update Status
            conn.execute("UPDATE documents SET status = 'PROCESSING' WHERE id = %s", (document_id,))
            
            # 2. Get Domain
            result = conn.execute("SELECT domain FROM documents WHERE id = %s", (document_id,)).fetchone()
            domain = result['domain'] if result and result['domain'] else 'general'
            logger.info(f"🔍 Processing document {document_id} in '{domain}' mode...")

            # 3. Download & Extract
            file_bytes = download_from_s3(file_key)
            full_text = extract_text_from_file(file_bytes, file_key)
            
            if not full_text or not full_text.strip():
                raise Exception("No text extracted.")

            # 4. Chunk & Embed
            strategy = STRATEGIES.get(domain, STRATEGIES["general"])
            c_size = strategy.get('chunk_size', 1000)
            c_overlap = strategy.get('chunk_overlap', 200)
            
            chunks = chunk_text(full_text, chunk_size=c_size, overlap=c_overlap)

            logger.info("🧠 Generating Embeddings...")
            for chunk in chunks:
                embedding = generate_embedding(chunk)
                conn.execute(
                    "INSERT INTO embeddings (document_id, content, embedding) VALUES (%s, %s, %s)",
                    (document_id, chunk, embedding)
                )

            # 5. Extract Graph
            extract_graph_from_text(full_text, document_id, conn, domain)

            # 6. Complete
            conn.execute("UPDATE documents SET status = 'COMPLETED' WHERE id = %s", (document_id,))
            logger.info(f"🎉 Success processing {file_key}")

        except Exception as e:
            logger.error(f"❌ Failed: {e}")
            conn.execute("UPDATE documents SET status = 'FAILED' WHERE id = %s", (document_id,))

# --- API ENDPOINTS ---

class ProcessRequest(BaseModel):
    file_key: str
    document_id: str

@app.post("/process")
async def process_document(request: ProcessRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(process_file_logic, request.file_key, request.document_id)
    return {"status": "processing_started"}

@app.get("/")
def health_check():
    return {"status": "ready"}

if __name__ == "__main__":
    import uvicorn # type: ignore
    uvicorn.run(app, host="0.0.0.0", port=8000)