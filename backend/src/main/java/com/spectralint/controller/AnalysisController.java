package com.spectralint.controller;

import com.spectralint.model.AnalysisReport;
import com.spectralint.model.AnalysisRequest;
import com.spectralint.service.AgentOrchestrator;
import com.spectralint.service.ReportExportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class AnalysisController {

    @Autowired
    private AgentOrchestrator orchestrator;

    @Autowired
    private ReportExportService exportService;

    /** Start a new analysis session. Returns sessionId + initial report stub. */
    @PostMapping("/analyze")
    public ResponseEntity<AnalysisReport> startAnalysis(@RequestBody AnalysisRequest request) {
        if (request.getUrl() == null || request.getUrl().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        AnalysisReport report = orchestrator.startAnalysis(request);
        return ResponseEntity.accepted().body(report);
    }

    /** Poll for status + partial/full results by sessionId. */
    @GetMapping("/analyze/{sessionId}")
    public ResponseEntity<AnalysisReport> getStatus(@PathVariable String sessionId) {
        return orchestrator.getReport(sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Download full report as plain text. */
    @GetMapping("/analyze/{sessionId}/export/txt")
    public ResponseEntity<String> exportTxt(@PathVariable String sessionId) {
        return orchestrator.getReport(sessionId)
                .map(r -> {
                    String txt = exportService.exportAsText(r);
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "attachment; filename=\"spectralint-" + r.getDomain() + ".txt\"")
                            .contentType(MediaType.TEXT_PLAIN)
                            .body(txt);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Download full report as JSON. */
    @GetMapping("/analyze/{sessionId}/export/json")
    public ResponseEntity<String> exportJson(@PathVariable String sessionId) {
        return orchestrator.getReport(sessionId)
                .map(r -> {
                    String json = exportService.exportAsJson(r);
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_DISPOSITION,
                                    "attachment; filename=\"spectralint-" + r.getDomain() + ".json\"")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(json);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Health check */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "SpectralINT"));
    }
}
