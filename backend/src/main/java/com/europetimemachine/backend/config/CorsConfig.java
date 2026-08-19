package com.europetimemachine.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // allowedOriginPatterns (rather than allowedOrigins) supports wildcards, e.g.
        // "https://*.vercel.app" to cover per-branch preview deployments alongside the
        // production origin, all from one env-var-driven comma-separated list.
        registry.addMapping("/api/**")
                .allowedOriginPatterns(allowedOrigins.split("\\s*,\\s*"))
                .allowedMethods("GET");
    }
}
