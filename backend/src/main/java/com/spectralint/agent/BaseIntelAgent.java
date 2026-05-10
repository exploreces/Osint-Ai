package com.spectralint.agent;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spectralint.model.AgentResult;
import com.spectralint.model.AgentType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.CompletableFuture;

public abstract class BaseIntelAgent implements IntelAgent {

    protected static final Logger log = LoggerFactory.getLogger(BaseIntelAgent.class);
    protected final ObjectMapper objectMapper = new ObjectMapper();
    protected final RestTemplate restTemplate = new RestTemplate();

    @Value("${anthropic.api.key:}")
    protected String anthropicApiKey;

    @Value("${anthropic.api.url:https://api.anthropic.com/v1/messages}")
    protected String anthropicApiUrl;

    protected abstract AgentType getAgentType();
    protected abstract String buildPrompt(String domain, String url);

    @Override
    @Async("agentExecutor")
    public CompletableFuture<AgentResult> execute(String domain, String url) {
        AgentResult result = new AgentResult(getAgentId(), getAgentType());
        log.info("╔══════════════════════════════════════════════════════════════╗");
        log.info("║ [{}] Starting analysis", getAgentLabel());
        log.info("║ Domain: {}", domain);
        log.info("║ URL: {}", url);
        log.info("╚══════════════════════════════════════════════════════════════╝");

        try {
            log.info("📝 [{}] Building specialized prompt...", getAgentLabel());
            String prompt = buildPrompt(domain, url);
            log.info("📤 [{}] Prompt length: {} characters", getAgentLabel(), prompt.length());
            log.debug("📤 [{}] Full prompt:\n{}", getAgentLabel(), prompt);

            log.info("🌐 [{}] Calling Claude API (model: claude-sonnet-4-20250514)...", getAgentLabel());
            log.info("🔑 [{}] API Key configured: {}", getAgentLabel(),
                anthropicApiKey != null && !anthropicApiKey.isEmpty() ? "YES (" + anthropicApiKey.substring(0, 12) + "...)" : "NO - MISSING!");

            Map<String, Object> data = callClaudeApi(prompt);

            log.info("✅ [{}] Successfully received response from Claude API", getAgentLabel());
            log.info("📊 [{}] Response keys: {}", getAgentLabel(), data.keySet());
            log.info("📄 [{}] Full response:\n{}", getAgentLabel(), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(data));

            result.complete(data);
            log.info("🎉 [{}] Completed in {}ms", getAgentLabel(), result.getDurationMs());
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        } catch (Exception e) {
            log.error("❌ [{}] FAILED: {}", getAgentLabel(), e.getMessage());
            log.error("🔍 [{}] Stack trace:", getAgentLabel(), e);
            result.fail(e.getMessage());
        }

        return CompletableFuture.completedFuture(result);
    }

    @SuppressWarnings("unchecked")
    protected Map<String, Object> callClaudeApi(String userPrompt) throws Exception {
        log.info("🔧 [{}] Preparing Claude API request...", getAgentLabel());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-api-key", anthropicApiKey);
        headers.set("anthropic-version", "2023-06-01");

        log.debug("🔑 Headers prepared: x-api-key={}, anthropic-version=2023-06-01",
            anthropicApiKey != null ? anthropicApiKey.substring(0, 12) + "..." : "NULL");

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");
        message.put("content", userPrompt);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "claude-sonnet-4-20250514");
        requestBody.put("max_tokens", 1500);
        requestBody.put("system",
            "You are a specialized AI security and OSINT agent. Always respond with valid JSON only. " +
            "No markdown, no explanation outside JSON. Be specific and realistic based on publicly " +
            "known information. If you don't have specific data, provide realistic placeholders " +
            "marked with [ESTIMATED] or [UNKNOWN].");
        requestBody.put("messages", List.of(message));

        log.info("📦 [{}] Request body prepared - model: claude-sonnet-4-20250514, max_tokens: 1500", getAgentLabel());
        log.debug("📦 [{}] Full request body:\n{}", getAgentLabel(), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(requestBody));

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        log.info("🚀 [{}] Sending POST request to: {}", getAgentLabel(), anthropicApiUrl);

        ResponseEntity<Map> response;
        try {
            response = restTemplate.exchange(anthropicApiUrl, HttpMethod.POST, entity, Map.class);
            log.info("✅ [{}] Received response - Status: {}", getAgentLabel(), response.getStatusCode());
        } catch (Exception e) {
            log.error("❌ [{}] API call failed: {}", getAgentLabel(), e.getMessage());
            log.error("🔍 [{}] Error details:", getAgentLabel(), e);
            throw new RuntimeException("Claude API call failed: " + e.getMessage(), e);
        }

        Map<String, Object> body = response.getBody();
        if (body == null) {
            log.error("❌ [{}] Empty response body from Claude API", getAgentLabel());
            throw new RuntimeException("Empty response from Claude API");
        }

        log.info("📥 [{}] Response body received - keys: {}", getAgentLabel(), body.keySet());
        log.debug("📥 [{}] Full response body:\n{}", getAgentLabel(), objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(body));

        List<Map<String, Object>> content = (List<Map<String, Object>>) body.get("content");
        if (content == null || content.isEmpty()) {
            log.error("❌ [{}] No content in Claude API response. Body: {}", getAgentLabel(), body);
            throw new RuntimeException("No content in Claude API response");
        }

        log.info("📄 [{}] Content blocks received: {}", getAgentLabel(), content.size());

        String rawText = (String) content.get(0).get("text");
        log.info("📝 [{}] Raw text length: {} characters", getAgentLabel(), rawText != null ? rawText.length() : 0);
        log.debug("📝 [{}] Raw text:\n{}", getAgentLabel(), rawText);

        String cleaned = rawText.replaceAll("```json|```", "").trim();
        log.info("🧹 [{}] Cleaned JSON text (removed markdown)", getAgentLabel());
        log.debug("🧹 [{}] Cleaned text:\n{}", getAgentLabel(), cleaned);

        Map<String, Object> parsedData;
        try {
            parsedData = objectMapper.readValue(cleaned, Map.class);
            log.info("✅ [{}] Successfully parsed JSON response", getAgentLabel());
            log.info("🔑 [{}] Parsed data keys: {}", getAgentLabel(), parsedData.keySet());
        } catch (Exception e) {
            log.error("❌ [{}] Failed to parse JSON: {}", getAgentLabel(), e.getMessage());
            log.error("📝 [{}] Problematic text:\n{}", getAgentLabel(), cleaned);
            throw new RuntimeException("Failed to parse Claude API response as JSON: " + e.getMessage(), e);
        }

        return parsedData;
    }
}
