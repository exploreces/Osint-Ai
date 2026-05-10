# ◈ SpectralINT — Multi-Agent OSINT & Security Intelligence Platform

A full-stack web application that deploys 8 specialized AI agents in parallel to perform
comprehensive OSINT (Open Source Intelligence) gathering and ethical security analysis on any
target domain or URL. Agents run concurrently to minimize total analysis time and results are
aggregated into a detailed downloadable report.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (UI)                       │
│  URL Input → Mode Select → Agent Dashboard → Results/Report │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API calls
┌───────────────────────▼─────────────────────────────────────┐
│              Spring Boot Backend (Java 21)                   │
│                  AgentOrchestrator                           │
│    (manages parallel CompletableFuture execution)            │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬───────────────┘
   │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼
Agent1  Agent2  Agent3  Agent4  Agent5  Agent6  Agent7
(runs concurrently via dedicated ThreadPoolTaskExecutor)
   └──────┴──────┴──────┴──────┴──────┴──────┘
                        │ (all complete)
                        ▼
                   Agent8: Report Compiler
                        │
                        ▼
               Compiled AnalysisReport
              (stored in session map)
```

---

## The 8 Agents

| # | Agent | ID | Purpose |
|---|-------|----|---------|
| 1 | 🔍 Public Search Agent | `public_search` | Google/Bing/Crunchbase: company info, news, tech stack |
| 2 | 📡 Social Media Agent | `social_media` | Twitter/X, LinkedIn, Instagram, Facebook presence |
| 3 | 🕵️ Leaked Data Agent | `leak_hunter` | Known breaches, Pastebin dumps, leaked documents |
| 4 | 💻 Code Intelligence Agent | `code_intel` | GitHub repos, leaked code, accidental secrets (type only) |
| 5 | 🌐 Domain Recon Agent | `domain_recon` | WHOIS, DNS, SSL, subdomains, hosting, email security |
| 6 | 🛡️ Vulnerability Agent | `vuln_scanner` | CVEs, security advisories, bug bounty, patch status |
| 7 | ⚡ Security Test Agent | `security_tester` | Passive ethical assessment: headers, TLS, cookies, CORS |
| 8 | 📊 Report Compiler Agent | `report_compiler` | Aggregates all findings into executive report + risk score |

**Agents 1–7 run in parallel. Agent 8 runs after all complete.**

---

## Analysis Modes

| Mode | Agents Used | Use Case |
|------|-------------|----------|
| `osint` | 1, 2, 3, 4, 5, 8 | Intelligence gathering only |
| `security` | 4, 6, 7, 8 | Security & vulnerability focus |
| `both` | All 8 | Full spectrum analysis |

---

## Project Structure

```
osint-webapp/
├── frontend/                          # React SPA
│   ├── src/
│   │   └── App.jsx                    # Main app (all UI + agent runner)
│   └── package.json
│
└── backend/                           # Spring Boot
    ├── pom.xml
    └── src/main/java/com/spectralint/
        ├── SpectralIntApplication.java        # Entry point
        ├── agent/
        │   ├── IntelAgent.java                # Interface
        │   ├── BaseIntelAgent.java            # Abstract base (Claude API caller)
        │   └── AgentImplementations.java      # All 8 concrete agents
        ├── controller/
        │   └── AnalysisController.java        # REST endpoints
        ├── service/
        │   ├── AgentOrchestrator.java         # Parallel execution manager
        │   └── ReportExportService.java       # TXT/JSON export
        ├── model/
        │   ├── AnalysisRequest.java
        │   ├── AnalysisReport.java
        │   ├── AgentResult.java
        │   └── AgentType.java
        └── config/
            └── AppConfig.java                 # ThreadPool + CORS config
```

---

## Setup & Running

### Prerequisites
- Java 21+
- Maven 3.9+
- Node.js 18+
- Anthropic API key

### Backend

```bash
cd backend

# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run
mvn spring-boot:run

# Backend starts at http://localhost:8080
```

### Frontend

The frontend uses the Claude API directly from the browser for the live demo artifact.
For production, proxy all `/api/v1/*` calls through the Spring Boot backend.

```bash
cd frontend
npm install
npm start
# Opens at http://localhost:3000
```

---

## REST API Reference

### Start Analysis
```
POST /api/v1/analyze
Content-Type: application/json

{
  "url": "https://example.com",
  "mode": "both"          // osint | security | both
}

→ 202 Accepted
{
  "sessionId": "uuid",
  "status": "IN_PROGRESS",
  "progressPercent": 0,
  ...
}
```

### Poll Status
```
GET /api/v1/analyze/{sessionId}

→ 200 OK
{
  "sessionId": "...",
  "status": "COMPLETE",
  "progressPercent": 100,
  "agentResults": [...],
  "compiledReport": { ... }
}
```

### Download Report
```
GET /api/v1/analyze/{sessionId}/export/txt     → plain text report
GET /api/v1/analyze/{sessionId}/export/json    → full JSON data
```

### Health Check
```
GET /api/v1/health
→ { "status": "UP", "service": "SpectralINT" }
```

---

## Connecting Frontend to Backend

In `App.jsx`, the `runAgent()` function calls Claude API directly (for the demo artifact).
For production, replace it with calls to your Spring Boot backend:

```javascript
// Replace runAgent() direct API call with:
const response = await fetch(`http://localhost:8080/api/v1/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, mode })
});
const { sessionId } = await response.json();

// Then poll:
const poll = setInterval(async () => {
  const r = await fetch(`http://localhost:8080/api/v1/analyze/${sessionId}`);
  const data = await r.json();
  if (data.status === 'COMPLETE') { clearInterval(poll); setResults(data); }
}, 2000);
```

---

## Security & Ethics

This platform is designed for **ethical, passive intelligence gathering only**:

- ✅ Reads publicly available information
- ✅ Uses AI to analyze and synthesize public data
- ✅ Security testing agent performs passive header/config checks only
- ✅ Reports bugs for remediation — never exploits them
- ❌ Does NOT perform active exploitation
- ❌ Does NOT exfiltrate or store actual credentials
- ❌ Does NOT conduct port scanning or active network probing

**Always obtain written permission before running analysis on any system you do not own.**

---

## Production Enhancements

| Concern | Recommendation |
|---------|---------------|
| Session storage | Replace `ConcurrentHashMap` with Redis |
| Rate limiting | Add `spring-boot-starter-rate-limiter` or API Gateway |
| Auth | Add JWT / OAuth2 via Spring Security |
| Queue | Use RabbitMQ/Kafka for large-scale agent job dispatch |
| Monitoring | Micrometer + Prometheus + Grafana |
| Deployment | Docker Compose: frontend (nginx) + backend (JVM) |


