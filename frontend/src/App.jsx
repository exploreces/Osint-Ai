import { useState, useEffect, useRef } from "react";

// Backend API base URL
const API_BASE = "http://localhost:8080/api/v1";

// ── Agent definitions ──────────────────────────────────────────────────────────
const OSINT_AGENTS = [
  { id: "public_search",    icon: "🔍", label: "Public Search Agent",     color: "#00d4ff", desc: "Google, Bing, DuckDuckGo, Yahoo" },
  { id: "social_media",     icon: "📡", label: "Social Media Agent",      color: "#ff6b35", desc: "Twitter/X, LinkedIn, Facebook, Instagram" },
  { id: "leak_hunter",      icon: "🕵️", label: "Leaked Data Agent",       color: "#a855f7", desc: "Pastebin, HaveIBeenPwned, dark indices" },
  { id: "code_intel",       icon: "💻", label: "Code Intelligence Agent", color: "#22c55e", desc: "GitHub, GitLab, Bitbucket, npm" },
  { id: "domain_recon",     icon: "🌐", label: "Domain Recon Agent",      color: "#f59e0b", desc: "WHOIS, DNS, SSL, Shodan-style" },
  { id: "vuln_scanner",     icon: "🛡️", label: "Vulnerability Agent",     color: "#ef4444", desc: "CVE databases, NVD, Exploit-DB" },
  { id: "security_tester",  icon: "⚡", label: "Security Test Agent",     color: "#ec4899", desc: "Ethical header/config/TLS checks" },
  { id: "report_compiler",  icon: "📊", label: "Report Compiler Agent",   color: "#06b6d4", desc: "Aggregates & generates final report" },
];

const SECURITY_AGENTS = [
  { id: "vuln_scanner",    icon: "🛡️", label: "Vulnerability Agent",     color: "#ef4444", desc: "CVE databases, NVD, Exploit-DB" },
  { id: "code_intel",      icon: "💻", label: "Code Intelligence Agent", color: "#22c55e", desc: "GitHub, GitLab, Bitbucket" },
  { id: "security_tester", icon: "⚡", label: "Security Test Agent",     color: "#ec4899", desc: "Ethical header/config/TLS checks" },
  { id: "report_compiler", icon: "📊", label: "Report Compiler Agent",   color: "#06b6d4", desc: "Aggregates & generates final report" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function extractDomain(url) {
  try { return new URL(url.startsWith("http") ? url : "https://" + url).hostname; }
  catch { return url; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("osint"); // osint | security | both
  const [running, setRunning] = useState(false);
  const [agentStates, setAgentStates] = useState({});
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  function addLog(msg, type = "info") {
    setLogs(l => [...l, { msg, type, ts: new Date().toLocaleTimeString() }]);
  }

  function updateAgent(id, patch) {
    setAgentStates(s => ({ ...s, [id]: { ...(s[id] || {}), ...patch } }));
  }

  async function runAnalysis() {
    if (!url.trim()) return;
    setRunning(true);
    setResults(null);
    setLogs([]);
    setProgress(0);
    setActiveTab("agents");
    const agents = mode === "security" ? SECURITY_AGENTS : mode === "osint" ? OSINT_AGENTS : [...OSINT_AGENTS];
    const initState = {};
    agents.forEach(a => { initState[a.id] = { status: "idle", data: null, progress: 0 }; });
    setAgentStates(initState);

    addLog(`🚀 Starting analysis for: ${url}`, "start");
    addLog(`📋 Mode: ${mode.toUpperCase()} | Agents: ${agents.length}`, "info");

    const domain = extractDomain(url);

    try {
      // Start analysis via backend API
      addLog(`📡 Connecting to backend API...`, "info");
      const startResponse = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url, mode: mode }),
      });

      if (!startResponse.ok) {
        throw new Error(`Backend error: ${startResponse.status} ${startResponse.statusText}`);
      }

      const startData = await startResponse.json();
      const sessionId = startData.sessionId;
      addLog(`✅ Analysis started | Session: ${sessionId}`, "success");

      // Poll for status updates
      let report = startData;
      while (report.status === "IN_PROGRESS") {
        await sleep(1000); // Poll every second

        const statusResponse = await fetch(`${API_BASE}/analyze/${sessionId}`);
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status}`);
        }

        report = await statusResponse.json();

        // Update progress
        setProgress(report.progressPercent || 0);

        // Update agent states based on completed agents
        if (report.agentResults) {
          report.agentResults.forEach(agentResult => {
            const agentId = agentResult.agentId;
            if (agentStates[agentId]?.status !== "done") {
              updateAgent(agentId, {
                status: agentResult.status === "SUCCESS" ? "done" : "error",
                data: agentResult.data,
                progress: 100
              });
              addLog(`${agentResult.status === "SUCCESS" ? "✅" : "❌"} [${agents.find(a => a.id === agentId)?.label || agentId}] ${agentResult.status}`, agentResult.status === "SUCCESS" ? "success" : "error");
            }
          });
        }
      }

      // Analysis complete
      addLog(`🎉 Analysis complete! Report ready.`, "success");
      setProgress(100);

      // Transform backend report to frontend format
      const agentsData = {};
      if (report.agentResults) {
        report.agentResults.forEach(agentResult => {
          agentsData[agentResult.agentId] = agentResult.data;
        });
      }

      const finalResults = {
        agents: agentsData,
        report: report.compiledReport || {},
        domain: report.domain,
        url: report.url,
        mode: report.mode,
        timestamp: report.completedAt || new Date().toISOString(),
        sessionId: sessionId
      };

      setResults(finalResults);
      setActiveTab("report");

    } catch (e) {
      addLog(`❌ Error: ${e.message}`, "error");
      console.error("Analysis error:", e);
    } finally {
      setRunning(false);
    }
  }

  const agents = mode === "security" ? SECURITY_AGENTS : OSINT_AGENTS;

  return (
    <div className="app">
      <style>{CSS}</style>

      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">SPECTRAL<span className="logo-accent">INT</span></span>
          </div>
          <div className="header-sub">Multi-Agent OSINT & Security Intelligence Platform</div>
        </div>
      </header>

      {/* ── URL Input ── */}
      <section className="input-section">
        <div className="input-card">
          <div className="input-label">TARGET URL / DOMAIN</div>
          <div className="input-row">
            <input
              className="url-input"
              placeholder="https://example.com  or  example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !running && runAnalysis()}
              disabled={running}
            />
            <button className={`run-btn ${running ? "running" : ""}`} onClick={runAnalysis} disabled={running}>
              {running ? <><span className="spin">◈</span> ANALYZING</> : "▶ RUN ANALYSIS"}
            </button>
          </div>
          <div className="mode-row">
            {["osint", "security", "both"].map(m => (
              <button key={m} className={`mode-btn ${mode === m ? "active" : ""}`} onClick={() => setMode(m)} disabled={running}>
                {m === "osint" ? "🔍 OSINT" : m === "security" ? "🛡️ SECURITY" : "⚡ BOTH"}
              </button>
            ))}
            <div className="mode-hint">
              {mode === "osint" ? "Public intel + social + leaks + code recon" : mode === "security" ? "Vuln scan + ethical security testing + bug reports" : "Full spectrum analysis — all 8 agents"}
            </div>
          </div>
          {running && (
            <div className="progress-wrap">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              <div className="progress-label">{progress}% — Agents running in parallel streams</div>
            </div>
          )}
        </div>
      </section>

      {/* ── Tabs ── */}
      {(running || results) && (
        <div className="tabs">
          {["dashboard", "agents", "results", "report"].map(t => (
            <button key={t} className={`tab ${activeTab === t ? "active" : ""}`} onClick={() => setActiveTab(t)}>
              {t === "dashboard" ? "📡 Dashboard" : t === "agents" ? "🤖 Agents" : t === "results" ? "📋 Results" : "📊 Report"}
            </button>
          ))}
        </div>
      )}

      {/* ── Dashboard Tab ── */}
      {(running || results) && activeTab === "dashboard" && (
        <div className="panel">
          <div className="agent-grid">
            {agents.map(agent => {
              const st = agentStates[agent.id] || {};
              return (
                <div key={agent.id} className={`agent-card ${st.status || "idle"}`} style={{ "--ac": agent.color }}>
                  <div className="agent-icon">{agent.icon}</div>
                  <div className="agent-name">{agent.label}</div>
                  <div className="agent-desc">{agent.desc}</div>
                  <div className="agent-bar"><div className="agent-fill" style={{ width: `${st.progress || 0}%`, background: agent.color }} /></div>
                  <div className="agent-status-badge">{st.status || "idle"}</div>
                </div>
              );
            })}
          </div>
          <div className="log-panel" ref={logRef}>
            {logs.map((l, i) => (
              <div key={i} className={`log-line log-${l.type}`}>
                <span className="log-ts">{l.ts}</span> {l.msg}
              </div>
            ))}
            {running && <div className="log-line log-info"><span className="blink">█</span></div>}
          </div>
        </div>
      )}

      {/* ── Agents Tab ── */}
      {(running || results) && activeTab === "agents" && (
        <div className="panel">
          <div className="agents-detail">
            {agents.map(agent => {
              const st = agentStates[agent.id] || {};
              return (
                <div key={agent.id} className={`agent-detail-card ${st.status || "idle"}`} style={{ "--ac": agent.color }}>
                  <div className="adc-header">
                    <span className="adc-icon">{agent.icon}</span>
                    <span className="adc-label">{agent.label}</span>
                    <span className={`adc-badge badge-${st.status || "idle"}`}>{st.status || "IDLE"}</span>
                  </div>
                  <div className="adc-desc">{agent.desc}</div>
                  <div className="adc-bar"><div style={{ width: `${st.progress || 0}%`, background: agent.color, height: "100%", borderRadius: 2, transition: "width 0.4s ease" }} /></div>
                  {st.status === "done" && st.data && (
                    <div className="adc-preview">
                      <pre>{JSON.stringify(st.data, null, 2).slice(0, 400)}…</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Results Tab ── */}
      {results && activeTab === "results" && (
        <div className="panel">
          <ResultsView results={results} agents={agents} agentStates={agentStates} />
        </div>
      )}

      {/* ── Report Tab ── */}
      {results && activeTab === "report" && (
        <div className="panel">
          <ReportView results={results} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!running && !results && (
        <div className="empty-state">
          <div className="empty-grid">
            {agents.map(a => (
              <div key={a.id} className="empty-agent" style={{ "--ac": a.color }}>
                <span>{a.icon}</span><span>{a.label}</span>
              </div>
            ))}
          </div>
          <div className="empty-hint">Enter a URL above and select analysis mode to deploy agents</div>
        </div>
      )}
    </div>
  );
}

// ── Results View ───────────────────────────────────────────────────────────────
function ResultsView({ results, agents, agentStates }) {
  const [selected, setSelected] = useState(agents[0]?.id);
  const st = agentStates[selected] || {};
  return (
    <div className="results-layout">
      <div className="results-sidebar">
        {agents.map(a => (
          <button key={a.id} className={`rsb-btn ${selected === a.id ? "active" : ""} ${agentStates[a.id]?.status || ""}`} style={{ "--ac": a.color }} onClick={() => setSelected(a.id)}>
            <span>{a.icon}</span> {a.label}
            {agentStates[a.id]?.status === "done" && <span className="check">✓</span>}
          </button>
        ))}
      </div>
      <div className="results-main">
        {st.data ? <JsonRenderer data={st.data} /> : <div className="no-data">No data yet for this agent.</div>}
      </div>
    </div>
  );
}

function JsonRenderer({ data }) {
  if (!data) return null;
  return (
    <div className="json-renderer">
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="jr-block">
          <div className="jr-key">{key.replace(/_/g, " ").toUpperCase()}</div>
          <div className="jr-val">
            {typeof val === "object" ? (
              Array.isArray(val)
                ? <ul className="jr-list">{val.map((v, i) => <li key={i}>{typeof v === "object" ? JSON.stringify(v) : v}</li>)}</ul>
                : <div className="jr-obj">{Object.entries(val).map(([k, v]) => <div key={k} className="jr-obj-row"><span className="jr-obj-key">{k}:</span> <span>{typeof v === "object" ? JSON.stringify(v) : String(v)}</span></div>)}</div>
            ) : <span>{String(val)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Report View ────────────────────────────────────────────────────────────────
function ReportView({ results }) {
  const compiler = results.agents?.report_compiler || {};
  const domain = results.domain;
  const riskScore = compiler.risk_score || 0;
  const posture = compiler.security_posture || "N/A";

  function downloadReport() {
    if (!results.sessionId) {
      // Fallback to local generation if no sessionId
      const txt = generateTextReport(results);
      const blob = new Blob([txt], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `spectralint-report-${domain}-${Date.now()}.txt`;
      a.click();
      return;
    }
    // Use backend endpoint
    window.location.href = `${API_BASE}/analyze/${results.sessionId}/export/txt`;
  }

  function downloadJSON() {
    if (!results.sessionId) {
      // Fallback to local generation if no sessionId
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `spectralint-data-${domain}-${Date.now()}.json`;
      a.click();
      return;
    }
    // Use backend endpoint
    window.location.href = `${API_BASE}/analyze/${results.sessionId}/export/json`;
  }

  return (
    <div className="report-view">
      <div className="report-header">
        <div>
          <div className="report-title">INTELLIGENCE REPORT</div>
          <div className="report-target">{domain}</div>
          <div className="report-ts">{new Date(results.timestamp).toLocaleString()}</div>
        </div>
        <div className="report-actions">
          <button className="dl-btn" onClick={downloadReport}>⬇ Download TXT</button>
          <button className="dl-btn" onClick={downloadJSON}>⬇ Download JSON</button>
        </div>
      </div>

      {/* Risk Score */}
      <div className="risk-block">
        <div className="risk-score-wrap">
          <svg viewBox="0 0 120 120" className="risk-svg">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#1a1a2e" strokeWidth="10" />
            <circle cx="60" cy="60" r="50" fill="none"
              stroke={riskScore > 70 ? "#ef4444" : riskScore > 40 ? "#f59e0b" : "#22c55e"}
              strokeWidth="10" strokeDasharray={`${riskScore * 3.14} 314`}
              strokeLinecap="round" transform="rotate(-90 60 60)" />
            <text x="60" y="65" textAnchor="middle" className="risk-num" fill="white" fontSize="22" fontWeight="bold">{riskScore}</text>
          </svg>
          <div>
            <div className="risk-label">RISK SCORE</div>
            <div className="risk-posture" style={{ color: riskScore > 70 ? "#ef4444" : riskScore > 40 ? "#f59e0b" : "#22c55e" }}>{posture}</div>
            {compiler.risk_justification && <div className="risk-just">{compiler.risk_justification}</div>}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      {compiler.executive_summary && (
        <div className="report-section">
          <div className="rs-title">EXECUTIVE SUMMARY</div>
          <div className="rs-body">{compiler.executive_summary}</div>
        </div>
      )}

      {/* Critical Findings */}
      {compiler.critical_findings && (
        <div className="report-section">
          <div className="rs-title">⚠ CRITICAL FINDINGS</div>
          <div className="findings-list">
            {(Array.isArray(compiler.critical_findings) ? compiler.critical_findings : Object.values(compiler.critical_findings)).map((f, i) => (
              <div key={i} className="finding-item">
                <span className="finding-num">{i + 1}</span>
                <span>{typeof f === "object" ? JSON.stringify(f) : f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {compiler.recommendations && (
        <div className="report-section">
          <div className="rs-title">💡 RECOMMENDATIONS</div>
          <div className="findings-list">
            {(Array.isArray(compiler.recommendations) ? compiler.recommendations : Object.values(compiler.recommendations)).map((r, i) => (
              <div key={i} className="finding-item rec">
                <span className="finding-num green">{i + 1}</span>
                <span>{typeof r === "object" ? JSON.stringify(r) : r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance */}
      {compiler.compliance_gaps && (
        <div className="report-section">
          <div className="rs-title">📋 COMPLIANCE GAPS</div>
          <div className="rs-body">{typeof compiler.compliance_gaps === "object" ? JSON.stringify(compiler.compliance_gaps, null, 2) : compiler.compliance_gaps}</div>
        </div>
      )}

      {/* All Agent Summaries */}
      <div className="report-section">
        <div className="rs-title">🤖 AGENT INTELLIGENCE SUMMARY</div>
        {Object.entries(results.agents || {}).filter(([k]) => k !== "report_compiler").map(([agentId, data]) => {
          const agent = OSINT_AGENTS.find(a => a.id === agentId) || SECURITY_AGENTS.find(a => a.id === agentId);
          if (!agent || !data) return null;
          return (
            <div key={agentId} className="agent-summary">
              <div className="as-header" style={{ color: agent.color }}>{agent.icon} {agent.label}</div>
              <div className="as-body">
                {Object.entries(data).slice(0, 4).map(([k, v]) => (
                  <div key={k} className="as-row">
                    <span className="as-key">{k.replace(/_/g, " ")}:</span>
                    <span className="as-val">{typeof v === "object" ? JSON.stringify(v).slice(0, 120) + "…" : String(v).slice(0, 150)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generateTextReport(results) {
  const lines = [
    "═══════════════════════════════════════════════════════════",
    "         SPECTRALINT — INTELLIGENCE REPORT",
    "═══════════════════════════════════════════════════════════",
    `Target:    ${results.url}`,
    `Domain:    ${results.domain}`,
    `Mode:      ${results.mode?.toUpperCase()}`,
    `Generated: ${new Date(results.timestamp).toLocaleString()}`,
    "───────────────────────────────────────────────────────────",
    "",
  ];
  const c = results.agents?.report_compiler || {};
  if (c.executive_summary) { lines.push("EXECUTIVE SUMMARY", c.executive_summary, ""); }
  if (c.risk_score !== undefined) { lines.push(`RISK SCORE: ${c.risk_score}/100  |  POSTURE: ${c.security_posture || "N/A"}`, c.risk_justification || "", ""); }
  if (c.critical_findings) {
    lines.push("CRITICAL FINDINGS");
    (Array.isArray(c.critical_findings) ? c.critical_findings : Object.values(c.critical_findings)).forEach((f, i) => lines.push(`  ${i + 1}. ${typeof f === "object" ? JSON.stringify(f) : f}`));
    lines.push("");
  }
  if (c.recommendations) {
    lines.push("RECOMMENDATIONS");
    (Array.isArray(c.recommendations) ? c.recommendations : Object.values(c.recommendations)).forEach((r, i) => lines.push(`  ${i + 1}. ${typeof r === "object" ? JSON.stringify(r) : r}`));
    lines.push("");
  }
  lines.push("───────────────────────────────────────────────────────────", "AGENT INTELLIGENCE DATA", "───────────────────────────────────────────────────────────");
  Object.entries(results.agents || {}).forEach(([id, data]) => {
    lines.push(`\n[${id.toUpperCase()}]`);
    lines.push(JSON.stringify(data, null, 2));
  });
  lines.push("\n═══════════════════════════════════════════════════════════");
  lines.push("END OF REPORT — Generated by SpectralINT");
  lines.push("═══════════════════════════════════════════════════════════");
  return lines.join("\n");
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #040d1a; color: #c8d8f0; font-family: 'Exo 2', sans-serif; min-height: 100vh; }

  .app { max-width: 1400px; margin: 0 auto; padding: 0 20px 60px; }

  /* Header */
  .header { border-bottom: 1px solid #0d2040; padding: 20px 0 16px; margin-bottom: 32px; }
  .header-inner { display: flex; align-items: baseline; gap: 20px; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { font-size: 28px; color: #00d4ff; animation: pulse 3s ease-in-out infinite; }
  .logo-text { font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #e8f4ff; }
  .logo-accent { color: #00d4ff; }
  .header-sub { font-size: 12px; color: #4a6080; letter-spacing: 2px; font-family: 'Share Tech Mono', monospace; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

  /* Input Section */
  .input-section { margin-bottom: 24px; }
  .input-card { background: #070f1f; border: 1px solid #0d2040; border-radius: 12px; padding: 24px; }
  .input-label { font-size: 11px; letter-spacing: 3px; color: #00d4ff; margin-bottom: 12px; font-family: 'Share Tech Mono', monospace; }
  .input-row { display: flex; gap: 12px; margin-bottom: 16px; }
  .url-input { flex: 1; background: #040d1a; border: 1px solid #0d2040; border-radius: 8px; padding: 14px 18px; color: #c8d8f0; font-size: 15px; font-family: 'Share Tech Mono', monospace; outline: none; transition: border-color 0.2s; }
  .url-input:focus { border-color: #00d4ff; }
  .url-input:disabled { opacity: 0.5; }
  .run-btn { background: linear-gradient(135deg, #00d4ff, #0066cc); border: none; border-radius: 8px; padding: 14px 28px; color: white; font-size: 13px; font-weight: 700; letter-spacing: 2px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: opacity 0.2s; white-space: nowrap; }
  .run-btn:hover:not(:disabled) { opacity: 0.85; }
  .run-btn.running { background: linear-gradient(135deg, #2a4060, #1a3050); cursor: not-allowed; }
  .run-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .mode-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .mode-btn { background: #0a1628; border: 1px solid #0d2040; border-radius: 6px; padding: 8px 18px; color: #607898; font-size: 12px; font-weight: 600; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; }
  .mode-btn.active { background: #001830; border-color: #00d4ff; color: #00d4ff; }
  .mode-btn:hover:not(:disabled) { border-color: #1a4060; color: #a0c0e0; }
  .mode-hint { font-size: 11px; color: #3a5070; font-family: 'Share Tech Mono', monospace; }

  .progress-wrap { margin-top: 16px; }
  .progress-bar { height: 4px; background: #0d2040; border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #00d4ff, #0066cc); border-radius: 2px; transition: width 0.5s ease; }
  .progress-label { font-size: 11px; color: #4a6080; margin-top: 6px; font-family: 'Share Tech Mono', monospace; }

  /* Tabs */
  .tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 1px solid #0d2040; }
  .tab { background: none; border: none; border-bottom: 2px solid transparent; padding: 10px 20px; color: #4a6080; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-bottom: -1px; }
  .tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }
  .tab:hover:not(.active) { color: #a0c0e0; }

  /* Panel */
  .panel { animation: fadeIn 0.3s ease; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

  /* Agent Grid */
  .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .agent-card { background: #070f1f; border: 1px solid #0d2040; border-radius: 10px; padding: 16px; transition: all 0.3s; position: relative; overflow: hidden; }
  .agent-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--ac); opacity: 0.3; }
  .agent-card.running::before { opacity: 1; animation: shimmer 1.5s linear infinite; }
  .agent-card.done::before { opacity: 1; }
  @keyframes shimmer { 0%{background-position:-200%} 100%{background-position:200%} }
  .agent-icon { font-size: 24px; margin-bottom: 8px; }
  .agent-name { font-size: 12px; font-weight: 700; color: #c8d8f0; margin-bottom: 4px; }
  .agent-desc { font-size: 10px; color: #3a5070; font-family: 'Share Tech Mono', monospace; margin-bottom: 10px; }
  .agent-bar { height: 3px; background: #0d2040; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
  .agent-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
  .agent-status-badge { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #3a5070; font-family: 'Share Tech Mono', monospace; }
  .agent-card.running .agent-status-badge { color: #00d4ff; }
  .agent-card.done .agent-status-badge { color: #22c55e; }
  .agent-card.error .agent-status-badge { color: #ef4444; }

  /* Log Panel */
  .log-panel { background: #02080f; border: 1px solid #0d2040; border-radius: 8px; padding: 16px; height: 220px; overflow-y: auto; font-family: 'Share Tech Mono', monospace; font-size: 12px; }
  .log-line { padding: 2px 0; line-height: 1.6; }
  .log-ts { color: #2a4060; margin-right: 8px; }
  .log-start { color: #00d4ff; }
  .log-info { color: #607898; }
  .log-agent { color: #a0c0e0; }
  .log-detail { color: #3a5870; }
  .log-success { color: #22c55e; }
  .log-error { color: #ef4444; }
  .blink { animation: blink 1s step-end infinite; }
  @keyframes blink { 50%{opacity:0} }

  /* Agents Detail */
  .agents-detail { display: flex; flex-direction: column; gap: 12px; }
  .agent-detail-card { background: #070f1f; border: 1px solid #0d2040; border-radius: 10px; padding: 18px; border-left: 3px solid var(--ac); }
  .adc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .adc-icon { font-size: 20px; }
  .adc-label { font-size: 14px; font-weight: 700; flex: 1; }
  .adc-badge { font-size: 10px; letter-spacing: 2px; padding: 3px 8px; border-radius: 3px; font-family: 'Share Tech Mono', monospace; }
  .badge-idle { background: #0d2040; color: #4a6080; }
  .badge-running { background: #001830; color: #00d4ff; }
  .badge-done { background: #052010; color: #22c55e; }
  .badge-error { background: #200505; color: #ef4444; }
  .adc-desc { font-size: 11px; color: #3a5070; font-family: 'Share Tech Mono', monospace; margin-bottom: 10px; }
  .adc-bar { height: 4px; background: #0d2040; border-radius: 2px; overflow: hidden; margin-bottom: 10px; }
  .adc-preview { background: #02080f; border-radius: 6px; padding: 12px; max-height: 140px; overflow: auto; }
  .adc-preview pre { font-size: 11px; color: #607898; font-family: 'Share Tech Mono', monospace; white-space: pre-wrap; }

  /* Results */
  .results-layout { display: grid; grid-template-columns: 220px 1fr; gap: 16px; min-height: 500px; }
  .results-sidebar { display: flex; flex-direction: column; gap: 4px; }
  .rsb-btn { background: #070f1f; border: 1px solid #0d2040; border-left: 3px solid transparent; border-radius: 6px; padding: 10px 12px; color: #4a6080; font-size: 12px; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
  .rsb-btn:hover { color: #a0c0e0; border-color: #1a3060; }
  .rsb-btn.active { border-left-color: var(--ac); color: #c8d8f0; background: #0a1628; }
  .rsb-btn.done { border-left-color: var(--ac); }
  .check { margin-left: auto; color: #22c55e; font-size: 14px; }
  .results-main { background: #070f1f; border: 1px solid #0d2040; border-radius: 10px; padding: 24px; overflow: auto; max-height: 700px; }
  .no-data { color: #3a5070; font-family: 'Share Tech Mono', monospace; }

  /* JSON Renderer */
  .json-renderer { display: flex; flex-direction: column; gap: 16px; }
  .jr-block { background: #040d1a; border-radius: 8px; padding: 14px; }
  .jr-key { font-size: 10px; letter-spacing: 3px; color: #00d4ff; font-family: 'Share Tech Mono', monospace; margin-bottom: 8px; }
  .jr-val { font-size: 13px; color: #a0c0e0; line-height: 1.6; }
  .jr-list { padding-left: 18px; }
  .jr-list li { margin-bottom: 4px; font-family: 'Share Tech Mono', monospace; font-size: 12px; color: #6080a0; }
  .jr-obj { display: flex; flex-direction: column; gap: 4px; }
  .jr-obj-row { font-size: 12px; font-family: 'Share Tech Mono', monospace; color: #6080a0; }
  .jr-obj-key { color: #4a80b0; margin-right: 6px; }

  /* Report */
  .report-view { display: flex; flex-direction: column; gap: 20px; }
  .report-header { display: flex; justify-content: space-between; align-items: flex-start; background: #070f1f; border: 1px solid #0d2040; border-radius: 10px; padding: 24px; }
  .report-title { font-size: 11px; letter-spacing: 4px; color: #00d4ff; font-family: 'Share Tech Mono', monospace; margin-bottom: 6px; }
  .report-target { font-size: 22px; font-weight: 900; color: #e8f4ff; margin-bottom: 4px; }
  .report-ts { font-size: 11px; color: #3a5070; font-family: 'Share Tech Mono', monospace; }
  .report-actions { display: flex; gap: 10px; }
  .dl-btn { background: #001830; border: 1px solid #00d4ff; border-radius: 6px; padding: 10px 16px; color: #00d4ff; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; letter-spacing: 1px; }
  .dl-btn:hover { background: #002448; }

  .risk-block { background: #070f1f; border: 1px solid #0d2040; border-radius: 10px; padding: 24px; }
  .risk-score-wrap { display: flex; align-items: center; gap: 24px; }
  .risk-svg { width: 100px; height: 100px; }
  .risk-label { font-size: 11px; letter-spacing: 3px; color: #4a6080; font-family: 'Share Tech Mono', monospace; margin-bottom: 6px; }
  .risk-posture { font-size: 20px; font-weight: 900; margin-bottom: 8px; }
  .risk-just { font-size: 13px; color: #607898; max-width: 500px; line-height: 1.5; }

  .report-section { background: #070f1f; border: 1px solid #0d2040; border-radius: 10px; padding: 24px; }
  .rs-title { font-size: 11px; letter-spacing: 3px; color: #00d4ff; font-family: 'Share Tech Mono', monospace; margin-bottom: 14px; }
  .rs-body { font-size: 14px; color: #a0b8d0; line-height: 1.7; white-space: pre-wrap; font-family: 'Share Tech Mono', monospace; font-size: 12px; }

  .findings-list { display: flex; flex-direction: column; gap: 10px; }
  .finding-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: #040d1a; border-radius: 8px; font-size: 13px; color: #a0b8d0; line-height: 1.5; }
  .finding-item.rec { background: #020c08; }
  .finding-num { min-width: 24px; height: 24px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
  .finding-num.green { background: #22c55e; }

  .agent-summary { background: #040d1a; border-radius: 8px; padding: 14px; margin-bottom: 10px; }
  .as-header { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
  .as-body { display: flex; flex-direction: column; gap: 4px; }
  .as-row { display: flex; gap: 8px; font-size: 11px; font-family: 'Share Tech Mono', monospace; }
  .as-key { color: #4a80b0; min-width: 140px; text-transform: capitalize; }
  .as-val { color: #607898; }

  /* Empty state */
  .empty-state { padding: 60px 0; text-align: center; }
  .empty-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-bottom: 32px; }
  .empty-agent { background: #070f1f; border: 1px solid #0d2040; border-left: 2px solid var(--ac); border-radius: 8px; padding: 10px 16px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: #3a5070; }
  .empty-hint { font-size: 12px; color: #2a3a50; font-family: 'Share Tech Mono', monospace; letter-spacing: 1px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #040d1a; }
  ::-webkit-scrollbar-thumb { background: #0d2040; border-radius: 3px; }

  @media (max-width: 768px) {
    .results-layout { grid-template-columns: 1fr; }
    .input-row { flex-direction: column; }
    .risk-score-wrap { flex-direction: column; }
    .report-header { flex-direction: column; gap: 16px; }
  }
`;
