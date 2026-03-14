import os
import json
from typing import AsyncGenerator

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "security_docs")

SYSTEM_PROMPT = """당신은 사내 정보보호 전문 어시스턴트입니다.
아래 참고 문서를 바탕으로 정확하고 친절하게 답변하세요.
참고 문서에 없는 내용은 솔직히 모른다고 답변하세요.

[참고 문서]
{context}"""


class RAGService:
    def __init__(self):
        self.embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model=EMBED_MODEL)
        self.llm = ChatOllama(base_url=OLLAMA_URL, model=OLLAMA_MODEL)
        self.qdrant_client = QdrantClient(url=QDRANT_URL)
        self._ensure_collection()
        self.vectorstore = QdrantVectorStore(
            client=self.qdrant_client,
            collection_name=COLLECTION_NAME,
            embedding=self.embeddings,
        )

    def _ensure_collection(self):
        existing = {c.name for c in self.qdrant_client.get_collections().collections}
        if COLLECTION_NAME not in existing:
            self.qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
            )

    def _retrieve_context(self, query: str) -> str:
        docs = self.vectorstore.similarity_search(query, k=4)
        if not docs:
            return "관련 문서 없음"
        return "\n\n---\n\n".join(d.page_content for d in docs)

    def _build_messages(self, query: str, history: list, context: str) -> list:
        messages = [SystemMessage(content=SYSTEM_PROMPT.format(context=context))]
        for msg in history[:-1]:  # 마지막 user 메시지 제외 (query로 별도 추가)
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        messages.append(HumanMessage(content=query))
        return messages

    async def aquery(self, query: str, history: list) -> str:
        context = self._retrieve_context(query)
        messages = self._build_messages(query, history, context)
        response = await self.llm.ainvoke(messages)
        return response.content

    async def astream(self, query: str, history: list) -> AsyncGenerator[str, None]:
        context = self._retrieve_context(query)
        messages = self._build_messages(query, history, context)
        async for chunk in self.llm.astream(messages):
            data = json.dumps({
                "choices": [{"delta": {"content": chunk.content}, "finish_reason": None}]
            })
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"
