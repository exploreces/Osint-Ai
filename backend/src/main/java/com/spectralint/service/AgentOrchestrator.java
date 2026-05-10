package com.spectralint.service;

import com.spectralint.agent.IntelAgent;
import com.spectralint.model.AgentResult;
import com.spectralint.model.AnalysisReport;
import com.spectralint.model.AnalysisRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Service
public class AgentOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(AgentOrchestrator.class);

    @Autowired
    private List<IntelAgent> allAgents;

    // In-memory session store (use Redis in production)
    private final ConcurrentHashMap<String, AnalysisReport> sessions = new ConcurrentHashMap<>();

    // OSINT-only agents
    private static final Set<String> OSINT_AGENTS = Set.of(
        "public_search", "social_media", "leak_hunter", "code_intel", "domain_recon", "report_compiler"
    );

    // Security-only agents
    private static final Set<String> SECURITY_AGENTS = Set.of(
        "vuln_scanner", "security_tester", "code_intel", "report_compiler"
    );

    public AnalysisReport startAnalysis(AnalysisRequest request) {
        String sessionId = UUID.randomUUID().toString();
        String domain = extractDomain(request.getUrl());
        String mode = request.getMode() != null ? request.getMode() : "both";

        log.info("═══════════════════════════════════════════════════════════════");
        log.info("🚀 NEW ANALYSIS SESSION STARTED");
        log.info("═══════════════════════════════════════════════════════════════");
        log.info("📋 Session ID: {}", sessionId);
        log.info("🌐 Target URL: {}", request.getUrl());
        log.info("🏢 Domain: {}", domain);
        log.info("⚙️  Mode: {}", mode.toUpperCase());
        log.info("───────────────────────────────────────────────────────────────");

        AnalysisReport report = new AnalysisReport();
        report.setSessionId(sessionId);
        report.setUrl(request.getUrl());
        report.setDomain(domain);
        report.setMode(mode);
        report.setStatus("IN_PROGRESS");
        report.setProgressPercent(0);
        report.setStartedAt(Instant.now());
        report.setAgentResults(Collections.synchronizedList(new ArrayList<>()));

        sessions.put(sessionId, report);

        // Select agents based on mode
        List<IntelAgent> selectedAgents = selectAgents(mode);
        log.info("🤖 Selected {} agents for {} mode:", selectedAgents.size(), mode.toUpperCase());
        selectedAgents.forEach(agent -> log.info("   • {} ({})", agent.getAgentLabel(), agent.getAgentId()));
        log.info("───────────────────────────────────────────────────────────────");

        // Run non-compiler agents in parallel, compiler last
        List<IntelAgent> parallelAgents = selectedAgents.stream()
                .filter(a -> !a.getAgentId().equals("report_compiler"))
                .collect(Collectors.toList());
        IntelAgent compilerAgent = selectedAgents.stream()
                .filter(a -> a.getAgentId().equals("report_compiler"))
                .findFirst().orElse(null);

        log.info("🔀 Starting {} agents in PARALLEL...", parallelAgents.size());
        if (compilerAgent != null) {
            log.info("📊 Report Compiler will run AFTER parallel agents complete");
        }
        log.info("═══════════════════════════════════════════════════════════════");

        // Launch all parallel agents
        List<CompletableFuture<AgentResult>> futures = parallelAgents.stream()
                .map(agent -> agent.execute(domain, request.getUrl())
                        .whenComplete((result, ex) -> {
                            if (result != null) {
                                report.getAgentResults().add(result);
                                int done = report.getAgentResults().size();
                                int total = selectedAgents.size();
                                report.setProgressPercent((int)(((double) done / total) * 85));
                                log.info("[{}] Agent {} done ({}/{})", sessionId, result.getAgentId(), done, total);
                            }
                        }))
                .collect(Collectors.toList());

        // When all parallel agents complete, run report compiler
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenRunAsync(() -> {
                    report.setProgressPercent(90);
                    log.info("═══════════════════════════════════════════════════════════════");
                    log.info("📊 [{}] All parallel agents completed. Starting Report Compiler...", sessionId);

                    if (compilerAgent != null) {
                        try {
                            AgentResult compilerResult = compilerAgent.execute(domain, request.getUrl()).get(60, TimeUnit.SECONDS);
                            report.getAgentResults().add(compilerResult);
                            if (compilerResult.getData() != null) {
                                report.setCompiledReport(compilerResult.getData());
                            }
                            log.info("✅ [{}] Report compilation complete", sessionId);
                        } catch (Exception e) {
                            log.error("[{}] Report compiler failed: {}", sessionId, e.getMessage());
                        }
                    }
                    report.setStatus("COMPLETE");
                    report.setProgressPercent(100);
                    report.setCompletedAt(Instant.now());
                    report.setTotalDurationMs(
                        report.getCompletedAt().toEpochMilli() - report.getStartedAt().toEpochMilli()
                    );

                    log.info("═══════════════════════════════════════════════════════════════");
                    log.info("🎉 ANALYSIS SESSION COMPLETE");
                    log.info("═══════════════════════════════════════════════════════════════");
                    log.info("📋 Session ID: {}", sessionId);
                    log.info("🏢 Domain: {}", domain);
                    log.info("⏱️  Total Duration: {}ms ({}s)", report.getTotalDurationMs(), report.getTotalDurationMs() / 1000.0);
                    log.info("✅ Successful Agents: {}", report.getAgentResults().stream().filter(r -> r.getStatus().equals("SUCCESS")).count());
                    log.info("❌ Failed Agents: {}", report.getAgentResults().stream().filter(r -> !r.getStatus().equals("SUCCESS")).count());
                    log.info("═══════════════════════════════════════════════════════════════");
                });

        return report;
    }

    public Optional<AnalysisReport> getReport(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    public void cleanupSession(String sessionId) {
        sessions.remove(sessionId);
    }

    private List<IntelAgent> selectAgents(String mode) {
        return switch (mode) {
            case "osint"    -> allAgents.stream().filter(a -> OSINT_AGENTS.contains(a.getAgentId())).collect(Collectors.toList());
            case "security" -> allAgents.stream().filter(a -> SECURITY_AGENTS.contains(a.getAgentId())).collect(Collectors.toList());
            default         -> new ArrayList<>(allAgents); // both
        };
    }

    private String extractDomain(String url) {
        try {
            String u = url.startsWith("http") ? url : "https://" + url;
            return new URI(u).getHost();
        } catch (Exception e) {
            return url;
        }
    }
}
