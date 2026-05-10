package com.spectralint.model;

import java.time.Instant;
import java.util.Map;

public class AgentResult {
    private String agentId;
    private AgentType agentType;
    private String status; // RUNNING, DONE, ERROR
    private Map<String, Object> data;
    private String errorMessage;
    private Instant startedAt;
    private Instant completedAt;
    private long durationMs;

    public AgentResult() {}

    public AgentResult(String agentId, AgentType agentType) {
        this.agentId = agentId;
        this.agentType = agentType;
        this.status = "RUNNING";
        this.startedAt = Instant.now();
    }

    public void complete(Map<String, Object> data) {
        this.data = data;
        this.status = "SUCCESS";
        this.completedAt = Instant.now();
        this.durationMs = completedAt.toEpochMilli() - startedAt.toEpochMilli();
    }

    public void fail(String errorMessage) {
        this.errorMessage = errorMessage;
        this.status = "ERROR";
        this.completedAt = Instant.now();
        this.durationMs = completedAt.toEpochMilli() - startedAt.toEpochMilli();
    }

    // Getters & Setters
    public String getAgentId() { return agentId; }
    public void setAgentId(String agentId) { this.agentId = agentId; }
    public AgentType getAgentType() { return agentType; }
    public void setAgentType(AgentType agentType) { this.agentType = agentType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Map<String, Object> getData() { return data; }
    public void setData(Map<String, Object> data) { this.data = data; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public long getDurationMs() { return durationMs; }
    public void setDurationMs(long durationMs) { this.durationMs = durationMs; }
}
