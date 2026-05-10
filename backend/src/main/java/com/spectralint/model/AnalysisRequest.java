package com.spectralint.model;

public class AnalysisRequest {
    private String url;
    private String mode; // osint | security | both

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }
}
