import os
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "security_docs")
DOCS_DIR = os.getenv("DOCS_DIR", "/app/docs")

LOADERS = {
    ".pdf": PyPDFLoader,
    ".txt": TextLoader,
    ".md": TextLoader,
}


async def run_ingest() -> int:
    docs_path = Path(DOCS_DIR)
    if not docs_path.exists():
        return 0

    all_docs = []
    for file in docs_path.rglob("*"):
        loader_cls = LOADERS.get(file.suffix.lower())
        if not loader_cls:
            continue
        try:
            all_docs.extend(loader_cls(str(file)).load())
            print(f"[OK] {file.name}")
        except Exception as e:
            print(f"[WARN] {file.name}: {e}")

    if not all_docs:
        return 0

    chunks = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200
    ).split_documents(all_docs)

    embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model=EMBED_MODEL)

    QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        url=QDRANT_URL,
        collection_name=COLLECTION_NAME,
        force_recreate=True,
    )

    return len(chunks)
