package com.spectralint.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class AnalysisReport {
    private String sessionId;
    private String url;
    private String domain;
    private String mode;
    private String status; // IN_PROGRESS | COMPLETE | FAILED
    private int progressPercent;
    private List<AgentResult> agentResults;
    private Map<String, Object> compiledReport;
    private Instant startedAt;
    private Instant completedAt;
    private long totalDurationMs;

    // Getters & Setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public int getProgressPercent() { return progressPercent; }
    public void setProgressPercent(int progressPercent) { this.progressPercent = progressPercent; }
    public List<AgentResult> getAgentResults() { return agentResults; }
    public void setAgentResults(List<AgentResult> agentResults) { this.agentResults = agentResults; }
    public Map<String, Object> getCompiledReport() { return compiledReport; }
    public void setCompiledReport(Map<String, Object> compiledReport) { this.compiledReport = compiledReport; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public long getTotalDurationMs() { return totalDurationMs; }
    public void setTotalDurationMs(long totalDurationMs) { this.totalDurationMs = totalDurationMs; }
}
