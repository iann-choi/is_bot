# ============================================================
# main.py - FastAPI 기반 IS Bot RAG API 서버
#
# 전체 흐름:
#   1. 앱 시작 시 RAGService 초기화 (Ollama + Qdrant 연결)
#   2. /ingest 엔드포인트로 문서를 Qdrant에 인덱싱
#   3. /v1/chat/completions 엔드포인트로 RAG 기반 답변 생성
#      - stream=false → 전체 응답을 한 번에 반환
#      - stream=true  → SSE(Server-Sent Events)로 청크 단위 스트리밍
# ============================================================

from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from rag import RAGService

# 전역 RAGService 인스턴스 (앱 생명주기 동안 유지)
rag: RAGService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행되는 생명주기 핸들러.
    시작 시 RAGService를 초기화하여 Ollama · Qdrant와 연결을 맺는다."""
    global rag
    rag = RAGService()
    yield


app = FastAPI(title="IS Bot RAG API", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="/app/docs/images"), name="static")


# --- 요청/응답 스키마 ---

class Message(BaseModel):
    role: str       # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    """OpenAI Chat Completions API 호환 요청 형식."""
    model: str = "is-bot"
    messages: List[Message]
    stream: bool = False          # True면 SSE 스트리밍 응답
    temperature: Optional[float] = 0.7


# --- 엔드포인트 ---

@app.get("/health")
async def health():
    """헬스체크 엔드포인트 — 파드/컨테이너 생존 확인용."""
    return {"status": "ok"}


@app.get("/v1/models")
async def list_models():
    """사용 가능한 모델 목록 반환 (OpenAI 호환 형식)."""
    return {
        "object": "list",
        "data": [{"id": "is-bot", "object": "model", "owned_by": "internal"}],
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """RAG 기반 채팅 응답 엔드포인트.

    처리 흐름:
        1. messages 중 가장 마지막 user 메시지를 현재 질의로 추출
        2. 전체 messages를 대화 이력(history)으로 구성
        3. stream 여부에 따라 스트리밍 또는 단일 응답 반환
    """
    # 가장 최근 user 메시지를 현재 질의로 사용
    user_query = next(
        (m.content for m in reversed(request.messages) if m.role == "user"), None
    )
    if not user_query:
        return {"error": "user 메시지가 없습니다."}

    # 전체 대화 이력을 dict 리스트로 변환 (RAGService에 전달)
    history = [{"role": m.role, "content": m.content} for m in request.messages]

    if request.stream:
        # SSE 스트리밍: 청크 단위로 토큰을 실시간 전송
        return StreamingResponse(
            rag.astream(user_query, history),
            media_type="text/event-stream",
        )

    # 단일 응답: 전체 답변을 생성한 뒤 OpenAI 호환 형식으로 반환
    content = await rag.aquery(user_query, history)
    return {
        "id": "chatcmpl-isbot",
        "object": "chat.completion",
        "model": request.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
    }


@app.post("/ingest")
async def ingest():
    """docs/ 폴더의 문서를 Qdrant에 인덱싱합니다.

    처리 흐름:
        1. docs/ 디렉터리의 PDF·TXT·MD 파일 로드
        2. 청크 단위로 분할
        3. Ollama 임베딩 → Qdrant 컬렉션에 저장
    """
    from ingest import run_ingest
    count = await run_ingest()
    return {"message": f"{count}개 청크가 인덱싱되었습니다."}
