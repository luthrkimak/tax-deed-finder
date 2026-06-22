# Railway Deploy — Backend FastAPI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer deploy do backend FastAPI no Railway para os scrapers rodarem 24/7 sem depender da máquina local.

**Architecture:** Dockerfile baseado na imagem oficial do Playwright Python (já inclui Chromium), buildado pelo Railway a cada push no GitHub. O APScheduler embutido no FastAPI dispara `run_all_scrapers()` às 2h diariamente dentro do container.

**Tech Stack:** Docker, Railway, FastAPI, uvicorn, APScheduler, mcr.microsoft.com/playwright/python:v1.44.0-jammy.

## Global Constraints

- Root directory no Railway: `backend/`
- Imagem base: `mcr.microsoft.com/playwright/python:v1.44.0-jammy` (alinhada com `playwright==1.44.0` do requirements.txt)
- Porta: variável `$PORT` injetada pelo Railway — nunca hardcodada
- Segredos nunca entram na imagem Docker (`.env` no `.dockerignore`)
- Health check: `GET /health` → `{"status": "ok"}`
- Plano gratuito Railway: 500h/mês — suficiente para 24/7

---

### Task 1: Criar Dockerfile e .dockerignore

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Criar `backend/Dockerfile`**

```dockerfile
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Instala deps primeiro para aproveitar cache de layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código
COPY . .

CMD uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

- [ ] **Step 2: Criar `backend/.dockerignore`**

```
.venv/
.env
__pycache__/
*.pyc
*.pyo
.pytest_cache/
tests/
scripts/
*.md
.git/
```

- [ ] **Step 3: Verificar que `.env` está excluído**

```bash
grep ".env" backend/.dockerignore
```
Esperado: `.env` aparece na lista.

- [ ] **Step 4: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "feat: Dockerfile para deploy no Railway com Playwright/Chromium"
```

---

### Task 2: Criar railway.toml e fazer push

**Files:**
- Create: `backend/railway.toml`

- [ ] **Step 1: Criar `backend/railway.toml`**

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn api.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "ON_FAILURE"
```

- [ ] **Step 2: Verificar que o repositório está no GitHub**

```bash
git remote -v
```
Esperado: uma linha `origin` apontando para `github.com/...`. Se não tiver, criar o repositório no GitHub e adicionar o remote:
```bash
gh repo create tax-deed-finder --private --source=. --push
```

- [ ] **Step 3: Commit e push**

```bash
git add backend/railway.toml
git commit -m "feat: configuração Railway (Dockerfile builder + health check)"
git push origin main
```
Esperado: push sem erro, branch `main` atualizada no GitHub.

---

### Task 3: Configurar projeto no Railway

Esta task é feita no browser — não requer código.

- [ ] **Step 1: Criar conta no Railway**

Acessar `https://railway.app` → criar conta (pode usar login com GitHub).

- [ ] **Step 2: Criar novo projeto**

No dashboard → **New Project** → **Deploy from GitHub repo** → selecionar o repositório do TAx Deed Finder.

- [ ] **Step 3: Definir Root Directory**

Nas configurações do serviço → **Settings** → **Root Directory** → digitar `backend`.

O Railway vai detectar o `Dockerfile` automaticamente.

- [ ] **Step 4: Configurar variáveis de ambiente**

No painel do serviço → **Variables** → adicionar cada variável abaixo (copiar os valores do `backend/.env`):

| Variável | Onde pegar o valor |
|---|---|
| `SUPABASE_URL` | `backend/.env` |
| `SUPABASE_SERVICE_KEY` | `backend/.env` |
| `SUPABASE_JWT_SECRET` | `backend/.env` |
| `RESEND_API_KEY` | `backend/.env` |
| `ALERT_FROM_EMAIL` | `backend/.env` |
| `CORS_ORIGINS` | Digitar: `http://localhost:5173` |
| `SCRAPE_DELAY_SECONDS` | Digitar: `2` |

- [ ] **Step 5: Aguardar o build**

Railway inicia o build automaticamente após salvar as variáveis. O primeiro build demora ~5 minutos (download da imagem Playwright ~1.5 GB).

Acompanhar em **Deployments** → clicar no deploy em andamento → ver logs.

Build bem-sucedido termina com:
```
✓ Build successful
✓ Healthcheck passed
```

- [ ] **Step 6: Verificar health check**

Copiar a URL pública gerada pelo Railway (ex: `https://tax-deed-finder-production.up.railway.app`).

```bash
curl https://<sua-url>.railway.app/health
```
Esperado:
```json
{"status": "ok"}
```

---

### Task 4: Atualizar frontend local e verificar end-to-end

**Files:**
- Modify: `frontend/.env`

- [ ] **Step 1: Atualizar `VITE_API_URL` no frontend**

Editar `frontend/.env`:
```
VITE_SUPABASE_URL=https://aqigjdqwqkapiyjbhksu.supabase.co
VITE_API_URL=https://<sua-url>.railway.app
```
Substituir `<sua-url>` pela URL real gerada no Railway.

- [ ] **Step 2: Reiniciar o servidor Vite**

Parar o servidor local (Ctrl+C) e reiniciar:
```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Verificar busca de leilões no browser**

Abrir `http://localhost:5173` → filtrar por Estado = FL → clicar Buscar.

Esperado: lista de leilões aparece (request vai para o Railway em vez de localhost:8000).

Verificar no DevTools (Network) que as chamadas de API estão indo para `https://<sua-url>.railway.app`.

- [ ] **Step 4: Verificar logs do scheduler no Railway**

No dashboard Railway → **Deployments** → **View Logs**.

O scheduler não loga nada até as 2h da manhã, mas o start do APScheduler deve aparecer nos logs de boot:
```
INFO:apscheduler.scheduler:Scheduler started
```

- [ ] **Step 5: (Opcional) Forçar execução dos scrapers para testar**

Adicionar temporariamente um endpoint de teste — **não commitado em produção**:

```bash
curl -X POST https://<sua-url>.railway.app/run-scrapers-test
```

Ou verificar diretamente no Supabase se novos registros aparecem após executar um scraper manualmente via Railway shell:
```bash
# No Railway dashboard → seu serviço → Shell (aba)
cd /app && python -c "
import sys; sys.path.insert(0, '.')
from scrapers.florida.orange_county import OrangeCountyScraper
r = OrangeCountyScraper().run()
print('new_ids:', r.new_ids)
"
```

Esperado: `new_ids: []` (nenhum novo — já estão no banco) ou lista de IDs se houver novos.
