package com.spectralint.agent;

import com.spectralint.model.AgentType;
import org.springframework.stereotype.Component;

// ── 1. Public Search Agent ─────────────────────────────────────────────────────
@Component
class PublicSearchAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "public_search"; }
    @Override public String getAgentLabel() { return "Public Search Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.PUBLIC_SEARCH; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a public OSINT search agent. For domain "%s" (URL: %s), gather public intelligence:
            1. Company overview, founding info, executives, funding rounds
            2. Public mentions in news, press releases, official documents
            3. Technology stack clues from job postings, LinkedIn, Crunchbase
            4. Public IP ranges, ASN numbers if known
            5. Employee count estimates, office locations
            6. Partnerships, subsidiaries, acquisitions
            Return JSON with keys: company_info, news_mentions, tech_stack, infrastructure_hints,
            employees_locations, partnerships""", domain, url);
    }
}

// ── 2. Social Media Agent ──────────────────────────────────────────────────────
@Component
class SocialMediaAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "social_media"; }
    @Override public String getAgentLabel() { return "Social Media Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.SOCIAL_MEDIA; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a social media intelligence agent. For domain "%s", research social presence:
            1. Official social handles (Twitter/X, LinkedIn, Facebook, Instagram, YouTube)
            2. Key employee social profiles (founders, CTO, CEO) if public
            3. Recent public posts themes and sentiment
            4. Community size and engagement metrics (approximate)
            5. Notable public incidents, complaints, or discussions
            6. Brand mentions and hashtags
            Return JSON with keys: official_accounts, key_people_social, sentiment_overview,
            community_metrics, notable_incidents, brand_mentions""", domain);
    }
}

// ── 3. Leak Hunter Agent ───────────────────────────────────────────────────────
@Component
class LeakHunterAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "leak_hunter"; }
    @Override public String getAgentLabel() { return "Leaked Data Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.LEAK_HUNTER; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a data leak intelligence agent. For domain "%s", analyze known public breach info:
            1. Known data breaches (HaveIBeenPwned, public announcements)
            2. Categories of credentials reported as leaked (no actual credentials)
            3. Pastebins or public dumps referencing this domain
            4. Leaked internal documents that became public
            5. Timeline of breach events
            6. Remediation steps taken (if publicly known)
            Return JSON with keys: known_breaches, credential_categories, public_dumps,
            leaked_documents, breach_timeline, remediation_status""", domain);
    }
}

// ── 4. Code Intelligence Agent ─────────────────────────────────────────────────
@Component
class CodeIntelAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "code_intel"; }
    @Override public String getAgentLabel() { return "Code Intelligence Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.CODE_INTEL; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a code intelligence agent. For domain "%s", research public code intelligence:
            1. Public GitHub/GitLab repositories linked to this organization
            2. Technology stack identified from public repos
            3. Known leaked or accidentally public repositories
            4. Open source contributions and libraries used
            5. Types of secrets accidentally committed (no actual values)
            6. Developer usernames associated
            7. CI/CD tools and deployment patterns visible
            Return JSON with keys: public_repos, tech_stack_from_code, leaked_code,
            oss_dependencies, accidental_secrets_types, developer_handles, devops_stack""", domain);
    }
}

// ── 5. Domain Recon Agent ──────────────────────────────────────────────────────
@Component
class DomainReconAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "domain_recon"; }
    @Override public String getAgentLabel() { return "Domain Recon Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.DOMAIN_RECON; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a domain reconnaissance agent. For domain "%s", provide technical domain intel:
            1. WHOIS information (registrar, dates, registrant if public)
            2. DNS records overview (A, MX, TXT, NS patterns)
            3. SSL/TLS certificate details and issuer
            4. Subdomains commonly found (login, api, dev, staging, admin patterns)
            5. Hosting provider and CDN
            6. Technologies detected (headers, cookies, CMS)
            7. Email security posture (SPF, DKIM, DMARC status)
            Return JSON with keys: whois_info, dns_overview, ssl_info, known_subdomains,
            hosting_cdn, detected_technologies, email_security""", domain);
    }
}

// ── 6. Vulnerability Scanner Agent ────────────────────────────────────────────
@Component
class VulnScannerAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "vuln_scanner"; }
    @Override public String getAgentLabel() { return "Vulnerability Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.VULN_SCANNER; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a vulnerability intelligence agent. For domain "%s", research known vulnerabilities:
            1. CVEs associated with their detected technology stack
            2. Known public vulnerabilities for their stack
            3. Historical security advisories
            4. Bug bounty program info if any
            5. Past security incidents publicly reported
            6. Severity breakdown estimate (Critical/High/Medium/Low)
            7. Patch status based on public info
            Return JSON with keys: associated_cves, stack_vulnerabilities, security_advisories,
            bug_bounty, past_incidents, severity_breakdown, patch_status""", domain);
    }
}

// ── 7. Security Tester Agent ───────────────────────────────────────────────────
@Component
class SecurityTesterAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "security_tester"; }
    @Override public String getAgentLabel() { return "Security Test Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.SECURITY_TESTER; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are an ethical security assessment agent. For domain "%s", describe a passive
            non-intrusive security assessment covering:
            1. HTTP security headers (X-Frame-Options, CSP, HSTS, X-Content-Type-Options)
            2. TLS/SSL configuration best practices
            3. Cookie security attributes (Secure, HttpOnly, SameSite)
            4. Information disclosure risks (error pages, server headers, stack traces)
            5. Authentication security indicators
            6. Rate limiting and bot protection
            7. CORS configuration risks
            8. Ethical methodology and scope boundary
            IMPORTANT: Passive assessment only. No exploitation. Document findings for remediation.
            Return JSON with keys: security_headers, tls_config, cookie_security, info_disclosure,
            auth_security, rate_limiting, cors_config, methodology, overall_grade""", domain);
    }
}

// ── 8. Report Compiler Agent ───────────────────────────────────────────────────
@Component
class ReportCompilerAgent extends BaseIntelAgent {
    @Override public String getAgentId() { return "report_compiler"; }
    @Override public String getAgentLabel() { return "Report Compiler Agent"; }
    @Override protected AgentType getAgentType() { return AgentType.REPORT_COMPILER; }
    @Override
    protected String buildPrompt(String domain, String url) {
        return String.format("""
            You are a report compilation agent. Create an executive summary for a security and
            OSINT analysis of "%s". Provide:
            1. Executive Summary (3-4 sentences)
            2. Risk Score (0-100) with justification
            3. Top 5 critical findings
            4. Top 5 actionable recommendations
            5. Compliance considerations (GDPR, SOC2, ISO27001 gaps)
            6. Overall security posture rating (Poor/Fair/Good/Excellent)
            7. Suggested next steps for the security team
            Return JSON with keys: executive_summary, risk_score, risk_justification,
            critical_findings, recommendations, compliance_gaps, security_posture, next_steps""",
            domain);
    }
}
