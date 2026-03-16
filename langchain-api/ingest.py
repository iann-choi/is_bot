# ============================================================
# ingest.py - 문서 인덱싱 파이프라인
#
# 전체 흐름:
#   1. docs/ 디렉터리를 재귀 탐색하여 지원 파일(PDF·TXT·MD) 로드
#   2. RecursiveCharacterTextSplitter로 1000자 단위 청크로 분할
#      (청크 간 200자 오버랩으로 문맥 유지)
#   3. Ollama 임베딩 모델로 각 청크를 벡터로 변환
#   4. Qdrant 컬렉션에 저장 (force_recreate=True → 기존 컬렉션 초기화 후 재생성)
# ============================================================

import os
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore

# --- 환경 변수 설정 (기본값은 로컬 개발 환경 기준) ---
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "security_docs")
DOCS_DIR = os.getenv("DOCS_DIR", "/app/docs")

# 파일 확장자 → 로더 클래스 매핑
LOADERS = {
    ".pdf": PyPDFLoader,
    ".txt": TextLoader,
    ".md": TextLoader,
}


async def run_ingest() -> int:
    """docs/ 폴더의 문서를 읽어 Qdrant에 벡터 인덱싱한다.

    Returns:
        저장된 청크 수 (docs/ 디렉터리가 없거나 문서가 없으면 0)
    """
    docs_path = Path(DOCS_DIR)
    if not docs_path.exists():
        return 0

    # --- Step 1: 지원 형식의 모든 파일 로드 ---
    all_docs = []
    for file in docs_path.rglob("*"):
        loader_cls = LOADERS.get(file.suffix.lower())
        if not loader_cls:
            continue  # 지원하지 않는 형식은 건너뜀
        try:
            all_docs.extend(loader_cls(str(file)).load())
            print(f"[OK] {file.name}")
        except Exception as e:
            print(f"[WARN] {file.name}: {e}")

    if not all_docs:
        return 0

    # --- Step 2: 문서를 청크 단위로 분할 ---
    # chunk_size=1000   : 한 청크의 최대 문자 수
    # chunk_overlap=200 : 인접 청크 간 중복 문자 수 (문맥 단절 방지)
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=200
    ).split_documents(all_docs)

    # --- Step 3: Ollama 임베딩 모델 초기화 ---
    embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model=EMBED_MODEL)

    # --- Step 4: Qdrant에 청크 저장 (컬렉션 초기화 후 재생성) ---
    QdrantVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        url=QDRANT_URL,
        collection_name=COLLECTION_NAME,
        force_recreate=True,  # 기존 컬렉션을 삭제하고 새로 생성
    )

    return len(chunks)
