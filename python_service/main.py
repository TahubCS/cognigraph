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
import base64
import json

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

# --- 🧠 SMART STRATEGIES (Context + Chunking Config) ---

STRATEGIES = {
    "legal": {
        "chunk_size": 2500,  # Large chunks to keep full clauses/contracts intact
        "chunk_overlap": 500,
        "system": "You are a Senior Legal Analyst. Extract entities related to contracts, laws, and compliance.",
        "nodes": ["Person", "Organization", "Contract", "Clause", "Statute", "Date", "Location"],
        "edges": ["SIGNED", "VIOLATES", "REFERENCES", "AMENDS", "LIABLE_FOR", "LOCATED_IN"],
        "prompt": """
            Analyze the text for legal relationships.
            - Identify parties (Person/Org) and their obligations.
            - Link Clauses to specific statutes or dates.
            - Highlight liability and compliance risks.
        """
    },
    "financial": {
        "chunk_size": 1500, # Medium-Large for tables and reports
        "chunk_overlap": 300,
        "system": "You are a Wall Street Financial Analyst. Extract entities related to markets, earnings, and risk.",
        "nodes": ["Company", "Metric", "Currency", "Asset", "Risk", "Regulation"],
        "edges": ["REPORTED", "INCREASED", "DECREASED", "OWNS", "HEDGES_AGAINST", "COMPLIES_WITH"],
        "prompt": """
            Analyze the text for financial performance and risk.
            - Extract KPIs (Revenue, EBITDA) and map them to Companies.
            - Identify market risks and regulatory dependencies.
        """
    },
    "medical": {
        "chunk_size": 1200, # Standard size for clinical notes
        "chunk_overlap": 250,
        "system": "You are a Chief Medical Officer. Extract clinical entities with high precision.",
        "nodes": ["Patient", "Symptom", "Condition", "Drug", "Treatment", "Dosage"],
        "edges": ["DIAGNOSED_WITH", "TREATED_WITH", "CAUSES", "PREVENTS", "CONTRAINDICATES"],
        "prompt": """
            Analyze the text for clinical relationships.
            - Map Symptoms to Conditions.
            - Link Treatments/Drugs to the Conditions they address.
            - Identify side effects or contraindications.
        """
    },
    "engineering": {
        "chunk_size": 1500, # Capture full function definitions/classes
        "chunk_overlap": 300,
        "system": "You are a Senior Staff Engineer. Extract technical architecture and dependencies.",
        "nodes": ["System", "Component", "Class", "Function", "API", "Database", "Service"],
        "edges": ["CALLS", "IMPORTS", "DEPENDS_ON", "RETURNS", "STORES_IN", "INHERITS_FROM"],
        "prompt": """
            Analyze the text for software architecture.
            - Identify System Components (Classes, Services) and how they interact.
            - Map API endpoints to the data they handle.
            - Highlight dependencies and potential failure points.
        """
    },
    "sales": {
        "chunk_size": 800, # Smaller chunks for emails/chats/RFPs
        "chunk_overlap": 150,
        "system": "You are a Sales Operations Manager. Extract customer needs and product fit.",
        "nodes": ["Client", "Product", "Feature", "PainPoint", "Requirement", "Competitor"],
        "edges": ["NEEDS", "PURCHASED", "COMPETES_WITH", "SOLVES", "REQUESTED"],
        "prompt": """
            Analyze the text for sales opportunities and requirements.
            - Map Clients to their specific Pain Points.
            - Link Products to the Requirements they solve.
            - Identify Competitors mentioned.
        """
    },
    "regulatory": {
        "chunk_size": 2000, # Large chunks for dense policy documents
        "chunk_overlap": 400,
        "system": "You are a Compliance Officer. Extract regulations and violations.",
        "nodes": ["Regulation", "Agency", "Policy", "Violation", "Standard", "Audit"],
        "edges": ["ENFORCES", "VIOLATES", "COMPLIES_WITH", "AUDITED_BY", "MANDATES"],
        "prompt": """
            Analyze the text for regulatory compliance.
            - Link Agencies (FDA, SEC) to the Regulations they enforce.
            - Identify internal Policies and check for alignment with Standards.
        """
    },
    "journalism": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "system": "You are an Investigative Journalist. Extract the who, what, where, and when.",
        "nodes": ["Person", "Event", "Location", "Date", "Source", "Organization"],
        "edges": ["WITNESSED", "REPORTED", "OCCURRED_AT", "INVOLVED_IN", "QUOTED"],
        "prompt": """
            Analyze the text for factual reporting.
            - Create a timeline of Events linked to Dates.
            - Map People to the Events they were involved in.
            - Track Sources of information.
        """
    },
    "hr": {
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "system": "You are a Human Resources Director. Extract employee and policy info.",
        "nodes": ["Employee", "Role", "Department", "Policy", "Benefit", "Skill"],
        "edges": ["REPORTS_TO", "MEMBER_OF", "ELIGIBLE_FOR", "REQUIRES", "VIOLATES"],
        "prompt": """
            Analyze the text for organizational structure and benefits.
            - Map Roles to Departments.
            - Link Employees to their Skills and Benefits.
            - Identify policy requirements.
        """
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

def get_db_connection():
    return psycopg.connect(
        os.getenv("DATABASE_URL"),
        row_factory=dict_row,
        autocommit=True
    )

def download_from_s3(file_key):
    print(f"📥 Downloading {file_key} from S3...")
    response = s3_client.get_object(Bucket=os.getenv("AWS_BUCKET_NAME"), Key=file_key)
    return response['Body'].read()

def get_image_description(image_bytes, source_info="image"):
    print(f"👁️ Analyzing visual content from {source_info}...")
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
        print(f"⚠️ Vision Error: {e}")
        return ""

def extract_text_from_file(file_bytes, file_key):
    print(f"📄 Extracting content from {file_key}...")
    file_ext = file_key.lower().split('.')[-1]
    
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
            print(f"⚠️ PDF Error: {e}")
            return ""
    elif file_ext in ['jpg', 'jpeg', 'png', 'webp']:
        return get_image_description(file_bytes, f"Uploaded File: {file_key}")
    else:
        try:
            return file_bytes.decode('utf-8')
        except:
            return file_bytes.decode('latin-1')

# UPDATED: Now accepts dynamic chunk_size and overlap
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
    response = openai_client.embeddings.create(input=text, model="text-embedding-3-small")
    return response.data[0].embedding

def extract_graph_from_text(text, document_id, conn, domain="general"):
    print(f"🕸️ Extracting Knowledge Graph (Mode: {domain.upper()})...")
    
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
    conn = get_db_connection()
    try:
        # 1. Update Status
        conn.execute("UPDATE documents SET status = 'PROCESSING' WHERE id = %s", (document_id,))
        
        # 2. Get Domain (Mode)
        result = conn.execute("SELECT domain FROM documents WHERE id = %s", (document_id,)).fetchone()
        domain = result['domain'] if result and result['domain'] else 'general'
        print(f"🔍 Processing document {document_id} in '{domain}' mode...")

        # 3. Download & Extract
        file_bytes = download_from_s3(file_key)
        full_text = extract_text_from_file(file_bytes, file_key)
        
        if not full_text.strip():
            raise Exception("No text extracted.")

        # 4. Chunk & Embed (USING SMART CONFIG)
        # -----------------------------------------------------------------
        strategy = STRATEGIES.get(domain, STRATEGIES["general"])
        
        # Use defaults if strategy is missing keys, but STRATEGIES has them all now
        c_size = strategy.get('chunk_size', 1000)
        c_overlap = strategy.get('chunk_overlap', 200)
        
        chunks = chunk_text(full_text, chunk_size=c_size, overlap=c_overlap)
        # -----------------------------------------------------------------

        print("🧠 Generating Embeddings...")
        for chunk in chunks:
            embedding = generate_embedding(chunk)
            conn.execute(
                "INSERT INTO embeddings (document_id, content, embedding) VALUES (%s, %s, %s)",
                (document_id, chunk, embedding)
            )

        # 5. Extract Graph (Using Domain Strategy)
        extract_graph_from_text(full_text, document_id, conn, domain)

        # 6. Complete
        conn.execute("UPDATE documents SET status = 'COMPLETED' WHERE id = %s", (document_id,))
        print(f"🎉 Success!")

    except Exception as e:
        print(f"❌ Failed: {e}")
        conn.execute("UPDATE documents SET status = 'FAILED' WHERE id = %s", (document_id,))
    finally:
        conn.close()

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