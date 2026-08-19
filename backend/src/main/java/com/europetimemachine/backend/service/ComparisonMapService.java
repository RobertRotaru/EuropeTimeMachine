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
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

/**
 * Loads the historical-basemaps Europe-clipped snapshots (one discrete year each, see
 * /data-pipeline/process-historical-basemaps.js) and finds the nearest available snapshot
 * year to a requested year, for the frontend's "compare with another source" overlay.
 */
@Service
public class ComparisonMapService {

    private static final Logger log = LoggerFactory.getLogger(ComparisonMapService.class);

    @Value("${app.data.dir}")
    private String dataDir;

    private final ObjectMapper objectMapper;
    private final TreeMap<Integer, JsonNode> byYear = new TreeMap<>();

    public ComparisonMapService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() throws IOException {
        Path path = Path.of(dataDir, "historical-basemaps-europe.json");
        JsonNode root = objectMapper.readTree(path.toFile());
        for (Map.Entry<String, JsonNode> entry : root.properties()) {
            byYear.put(Integer.valueOf(entry.getKey()), entry.getValue());
        }
        log.info("Loaded {} historical-basemaps comparison snapshots", byYear.size());
    }

    public record SnapshotResult(int snapshotYear, JsonNode featureCollection) {
    }

    public Optional<SnapshotResult> findNearest(int year) {
        if (byYear.isEmpty()) {
            return Optional.empty();
        }
        int nearest = byYear.keySet().stream()
                .min(Comparator.comparingInt(y -> Math.abs(y - year)))
                .orElseThrow();
        return Optional.of(new SnapshotResult(nearest, byYear.get(nearest)));
    }
}
