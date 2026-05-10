package com.spectralint.agent;

import com.spectralint.model.AgentResult;
import java.util.concurrent.CompletableFuture;

public interface IntelAgent {
    String getAgentId();
    String getAgentLabel();
    CompletableFuture<AgentResult> execute(String domain, String url);
}
