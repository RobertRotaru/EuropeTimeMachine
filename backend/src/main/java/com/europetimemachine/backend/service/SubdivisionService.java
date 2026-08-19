package com.europetimemachine.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Loads modern (present-day) Natural Earth admin-1 subdivisions, grouped by ISO 3166-1
 * alpha-2 country code (see /data-pipeline/process-natural-earth.js). Only meaningful for
 * present-day years — there is no open historical subdivision dataset to fall back to.
 */
@Service
public class SubdivisionService {

    private static final Logger log = LoggerFactory.getLogger(SubdivisionService.class);

    @Value("${app.data.dir}")
    private String dataDir;

    private final ObjectMapper objectMapper;
    private final Map<String, JsonNode> byCountry = new HashMap<>();

    public SubdivisionService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() throws IOException {
        Path path = Path.of(dataDir, "subdivisions-europe.json");
        JsonNode root = objectMapper.readTree(path.toFile());
        for (Map.Entry<String, JsonNode> entry : root.properties()) {
            byCountry.put(entry.getKey(), entry.getValue());
        }
        log.info("Loaded subdivisions for {} countries", byCountry.size());
    }

    public Optional<JsonNode> getFeaturesForCountry(String isoA2) {
        return Optional.ofNullable(byCountry.get(isoA2.toUpperCase()));
    }
}
