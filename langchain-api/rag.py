# ============================================================
# rag.py - RAG(Retrieval-Augmented Generation) 서비스
#
# 전체 흐름 (질의 1회 기준):
#   1. 사용자 질의를 임베딩하여 Qdrant에서 유사 문서 k=4 개 검색
#   2. 검색된 문서를 시스템 프롬프트의 [참고 문서] 섹션에 삽입
#   3. 대화 이력 + 현재 질의를 LangChain 메시지 리스트로 구성
#   4. Ollama LLM에 메시지를 전달하여 답변 생성
#      - aquery  : 전체 응답을 한 번에 반환
#      - astream : SSE 형식으로 토큰을 청크 단위로 스트리밍
# ============================================================

import os
import re
import json
from datetime import datetime
from typing import AsyncGenerator

from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

# --- 환경 변수 설정 (기본값은 로컬 개발 환경 기준) ---
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
EMBED_DIM = int(os.getenv("EMBED_DIM", "768"))          # 임베딩 벡터 차원
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "security_docs")

# 시스템 프롬프트: {today}, {context} 자리에 값이 삽입됨
SYSTEM_PROMPT = """당신은 사내 정보보호 챗봇입니다.
현재 날짜와 시간은 {today}입니다. 날짜나 시간 관련 질문에는 반드시 이 값을 사용하고, 절대로 다른 날짜를 추측하거나 지어내지 마세요.
당신의 이름은 "정보보호 어시스턴트"이며, 회사(aitrics) 내 정보보호 정책과 보안 관련 질문에 답변하기 위해 만들어졌습니다.
절대로 외부 AI 서비스(Google, OpenAI 등)라고 밝히지 마세요.
아래 참고 문서를 바탕으로 답변하되, 다음 규칙을 따르세요:
- 참고 문서를 그대로 복사하지 말고 내용을 이해한 후 자연스럽게 설명하세요.
- 참고 문서에 이미지(![...](url) 형식)가 포함된 경우 반드시 해당 마크다운 이미지 문법을 그대로 답변에 포함하세요.
- 사용자의 질문 맥락에 맞게 필요한 내용만 골라서 답변하세요.
- 마치 옆에 있는 동료가 친절하게 설명해주듯이 답변하세요.
- 참고 문서에 없는 내용은 솔직히 모른다고 답변하세요.
정보보호와 무관한 질문은 정중히 거절하세요.
보안 사고, 긴급 상황, 또는 추가 문의가 필요한 경우 슬랙 @is 로 문의 또는 신고하도록 안내하세요.
모든 답변은 참고용이며, 최종 판단은 슬랙 @is 로 문의하도록 안내하세요.

답변 시 다음 규칙을 따르세요:
- 항목별로 정리하여 읽기 쉽게 작성하세요.
- 중요한 내용은 강조하여 표시하세요.
- 요점만 간결하게 작성하고 불필요하게 길게 쓰지 마세요.
- 딱딱하지 않고 친근한 말투로, 항상 존댓말을 사용하세요.

[참고 문서]
{context}"""


class RAGService:
    """Ollama LLM + Qdrant 벡터스토어를 결합한 RAG 서비스."""

    def __init__(self):
        # 임베딩 모델 초기화 (문서 검색용 벡터 생성)
        self.embeddings = OllamaEmbeddings(base_url=OLLAMA_URL, model=EMBED_MODEL)
        # 채팅 LLM 초기화 (답변 생성)
        self.llm = ChatOllama(base_url=OLLAMA_URL, model=OLLAMA_MODEL)
        # Qdrant 클라이언트 연결
        self.qdrant_client = QdrantClient(url=QDRANT_URL)
        # 컬렉션이 없으면 생성
        self._ensure_collection()
        # LangChain용 벡터스토어 래퍼
        self.vectorstore = QdrantVectorStore(
            client=self.qdrant_client,
            collection_name=COLLECTION_NAME,
            embedding=self.embeddings,
        )

    def _ensure_collection(self):
        """Qdrant에 컬렉션이 없으면 코사인 유사도 기반으로 새로 생성한다."""
        existing = {c.name for c in self.qdrant_client.get_collections().collections}
        if COLLECTION_NAME not in existing:
            self.qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
            )

    def _retrieve_context(self, query: str) -> tuple[str, list]:
        """질의와 가장 유사한 문서 k=4개를 Qdrant에서 검색하여 반환한다.

        Returns:
            (context, link_candidates) - 문서 텍스트와 (링크, 문서 요약) 튜플 리스트
        """
        docs_with_score = self.vectorstore.similarity_search_with_score(query, k=4)
        if not docs_with_score:
            return "관련 문서 없음", []

        context = "\n\n---\n\n".join(d.page_content for d, _ in docs_with_score)

        # 링크가 있는 문서에서 (링크, 문서 첫 200자) 추출
        link_candidates = []
        for doc, _ in docs_with_score:
            links = re.findall(r'\[([^\]]+)\]\((http[^\)]+)\)', doc.page_content)
            if links:
                summary = doc.page_content[:200]
                link_candidates.append((links, summary))

        return context, link_candidates

    async def _is_relevant(self, query: str, doc_summary: str) -> bool:
        """LLM에게 질문과 문서의 관련성을 판단하게 한다."""
        prompt = f"""다음 질문이 아래 문서 내용과 관련이 있으면 '예', 없으면 '아니오'만 답하세요.

질문: {query}

문서 내용:
{doc_summary}

답변 (예/아니오):"""
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        return "예" in response.content

    async def _filter_links(self, query: str, link_candidates: list) -> str:
        """LLM이 관련 있다고 판단한 문서의 링크만 반환한다."""
        matched_links = []
        for links, summary in link_candidates:
            if await self._is_relevant(query, summary):
                matched_links.extend(links)

        if not matched_links:
            return ""

        links_md = "\n\n---\n📎 **참고 자료**\n"
        links_md += "\n".join(f"[{text}]({url})" for text, url in matched_links)
        return links_md

    def _build_messages(self, query: str, history: list, context: str) -> list:
        """LLM에 전달할 메시지 리스트를 구성한다.

        구성 순서:
            [SystemMessage(참고 문서 포함)]
            [HumanMessage / AIMessage × 이전 대화 이력]
            [HumanMessage(현재 질의)]
        """
        # 시스템 프롬프트에 검색된 문서 삽입
        today = datetime.now().strftime("%Y년 %m월 %d일 %H시 %M분")
        messages = [SystemMessage(content=SYSTEM_PROMPT.format(today=today, context=context))]
        # 마지막 user 메시지는 query로 별도 추가하므로 이력에서 제외
        for msg in history[:-1]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
        # 현재 질의를 마지막 메시지로 추가
        messages.append(HumanMessage(content=query))
        return messages

    async def aquery(self, query: str, history: list) -> str:
        """RAG 기반 단일 응답 생성.

        흐름: 문서 검색 → 메시지 구성 → LLM 호출 → 관련성 판단 → 링크 추가 → 텍스트 반환
        """
        context, link_candidates = self._retrieve_context(query)
        messages = self._build_messages(query, history, context)
        response = await self.llm.ainvoke(messages)
        links_md = await self._filter_links(query, link_candidates)
        return response.content + links_md

    async def astream(self, query: str, history: list) -> AsyncGenerator[str, None]:
        """RAG 기반 SSE 스트리밍 응답 생성.

        흐름: 문서 검색 → 메시지 구성 → LLM 스트리밍 → 관련성 판단 → 링크 추가 → SSE yield
        """
        context, link_candidates = self._retrieve_context(query)
        messages = self._build_messages(query, history, context)

        async for chunk in self.llm.astream(messages):
            data = json.dumps({
                "choices": [{"delta": {"content": chunk.content}, "finish_reason": None}]
            })
            yield f"data: {data}\n\n"

        # LLM이 관련성 판단 후 링크 추가
        links_md = await self._filter_links(query, link_candidates)
        if links_md:
            data = json.dumps({
                "choices": [{"delta": {"content": links_md}, "finish_reason": None}]
            })
            yield f"data: {data}\n\n"
        yield "data: [DONE]\n\n"
