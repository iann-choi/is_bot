from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from rag import RAGService

rag: RAGService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag
    rag = RAGService()
    yield


app = FastAPI(title="IS Bot RAG API", lifespan=lifespan)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "is-bot"
    messages: List[Message]
    stream: bool = False
    temperature: Optional[float] = 0.7


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/v1/models")
async def list_models():
    return {
        "object": "list",
        "data": [{"id": "is-bot", "object": "model", "owned_by": "internal"}],
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    user_query = next(
        (m.content for m in reversed(request.messages) if m.role == "user"), None
    )
    if not user_query:
        return {"error": "user 메시지가 없습니다."}

    history = [{"role": m.role, "content": m.content} for m in request.messages]

    if request.stream:
        return StreamingResponse(
            rag.astream(user_query, history),
            media_type="text/event-stream",
        )

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
    """docs/ 폴더의 문서를 Qdrant에 인덱싱합니다."""
    from ingest import run_ingest
    count = await run_ingest()
    return {"message": f"{count}개 청크가 인덱싱되었습니다."}
