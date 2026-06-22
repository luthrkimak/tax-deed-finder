# Railway Deploy — Backend FastAPI

**Data:** 2026-06-22
**Objetivo:** Fazer deploy do backend no Railway para que os scrapers rodem 24/7 automaticamente, sem depender da máquina local.

---

## Contexto

O backend FastAPI embute um APScheduler que chama `run_all_scrapers()` todo dia às 2h. Hoje ele só roda enquanto o desenvolvedor mantém o servidor local ligado. O deploy no Railway resolve isso.

O frontend permanece local neste momento — só o `VITE_API_URL` precisa ser atualizado após o deploy.

---

## Arquitetura

```
GitHub (push) → Railway (build Dockerfile) → Container rodando uvicorn
                                                   ↓
                                         APScheduler (2h diário)
                                                   ↓
                                    56 scrapers → Supabase → email alerts
```

**Railway root directory:** `backend/`
**Porta:** variável `$PORT` fornecida pelo Railway (uvicorn liga em `0.0.0.0:$PORT`)
**Health check:** `GET /health` → `{"status": "ok"}` (já existe)

---

## Arquivos a criar

### `backend/Dockerfile`

- Base: `mcr.microsoft.com/playwright/python:v1.44.0-jammy`
  - Já inclui Python 3.11, Chromium e todas as dependências de sistema do Playwright
  - Versão alinhada com `playwright==1.44.0` do `requirements.txt`
- Copia apenas o código necessário (sem `.venv`, `.env`, `tests/`)
- Instala dependências via `pip install -r requirements.txt`
- Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

### `backend/.dockerignore`

Exclui da imagem:
- `.venv/` — dependências são reinstaladas no container
- `.env` — segredos nunca entram na imagem
- `__pycache__/`, `*.pyc`
- `tests/`
- `scripts/` — scripts de manutenção não são necessários em produção

### `backend/railway.toml`

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

---

## Variáveis de ambiente no Railway

Configuradas no dashboard do Railway (nunca commitadas):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://aqigjdqwqkapiyjbhksu.supabase.co` |
| `SUPABASE_SERVICE_KEY` | (do backend/.env) |
| `SUPABASE_JWT_SECRET` | (do backend/.env) |
| `RESEND_API_KEY` | (do backend/.env) |
| `ALERT_FROM_EMAIL` | `alerts@yourdomain.com` |
| `CORS_ORIGINS` | `http://localhost:5173` |
| `SCRAPE_DELAY_SECONDS` | `2` |

---

## Atualização do frontend local

Após o deploy, editar `frontend/.env`:

```
VITE_API_URL=https://<projeto>.railway.app
```

E reiniciar o Vite local (`npm run dev`).

---

## Processo de deploy

1. Criar conta no Railway (railway.app) se não tiver
2. Criar novo projeto → "Deploy from GitHub repo"
3. Selecionar repositório → definir **Root Directory** como `backend`
4. Configurar as variáveis de ambiente no dashboard
5. Railway detecta o Dockerfile e builda automaticamente
6. Verificar `/health` na URL gerada
7. Atualizar `VITE_API_URL` no frontend local

**Deploys futuros:** automáticos a cada `git push` na branch `main`.

---

## Restrições

- Playwright/Chromium aumenta o tamanho da imagem (~1.5 GB) — build inicial demora ~5 min
- Plano gratuito do Railway tem 500 horas/mês — suficiente para 24/7 com margem
- `CORS_ORIGINS` deve incluir a URL de produção do frontend quando ele for deployado futuramente
