# 사내 정보보호 챗봇 (IS Bot)

Ollama + Qdrant + LangChain RAG + Open WebUI 기반 사내 정보보호 전문 챗봇

## 아키텍처

```
사용자 (브라우저 :3000)
    │
Open WebUI  ──→  LangChain RAG API (:8080)
                      │              │
                   Ollama          Qdrant
                 (LLM + 임베딩)  (벡터 검색)
```

## 환경 구성

| 환경 | K8s 클러스터 | values 파일 |
|------|-------------|-------------|
| 로컬 (맥북) | Docker Desktop K8s / minikube | `values-local.yaml` |
| 프로덕션 | AWS EKS / 온프레미스 | `values-prod.yaml` |

---

## 로컬 환경 시작 (맥북)

### 사전 준비
- Docker Desktop (Kubernetes 활성화) 또는 minikube
- kubectl, helm

### 배포
```bash
# 1. 이미지 빌드
docker build -t is-bot-api:latest ./langchain-api

# 2. 배포
helm upgrade --install is-bot ./helm \
  -f helm/values-local.yaml \
  --set langchainApi.image=is-bot-api:latest

# 3. 배포 확인
kubectl get pods -n is-bot

# 4. 브라우저 접속: http://localhost:30300
```

### 문서 인덱싱
```bash
# docs/ 폴더에 PDF/TXT/MD 파일 추가 후
kubectl exec -n is-bot deploy/langchain-api -- \
  curl -X POST http://localhost:8080/ingest
```

---

## 프로덕션 배포 (AWS EKS / 온프레미스)

```bash
# 1. 이미지 빌드 & 푸시
docker build -t your-registry/is-bot-api:latest ./langchain-api
docker push your-registry/is-bot-api:latest

# 2. values-prod.yaml 수정
#    - langchainApi.image: 실제 이미지 주소
#    - ingress.host: 실제 내부 도메인
#    - storageClass: 클러스터 환경에 맞는 StorageClass

# 3. 배포
helm upgrade --install is-bot ./helm \
  -f helm/values-prod.yaml

# 4. 모델 다운로드 상태 확인 (post-install Job 자동 실행)
kubectl logs -n is-bot job/ollama-model-init -f
```

---

## 모델 기본값

| 항목 | 로컬 | 프로덕션 |
|------|------|---------|
| LLM | `gemma3:4b` | `gemma3:12b` |
| 임베딩 | `nomic-embed-text` | `nomic-embed-text` |

`values-*.yaml` 의 `ollama.model` / `ollama.embedModel` 에서 변경 가능

---

## GPU 사용 (프로덕션, 선택)

`values-prod.yaml` 에서 주석 해제:
```yaml
ollama:
  gpu:
    enabled: true
    nodeSelector:
      accelerator: nvidia
  resources:
    limits:
      nvidia.com/gpu: "1"
```
