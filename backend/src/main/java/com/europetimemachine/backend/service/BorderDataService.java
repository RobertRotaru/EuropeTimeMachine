package com.europetimemachine.backend.service;

import com.europetimemachine.backend.model.BorderFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads the Europe-clipped Cliopatria polities dataset once at startup and serves the
 * subset of features whose [fromYear, toYear] range covers a requested year. This is the
 * primary border layer (see /data-pipeline/process-cliopatria.js for how the raw ~165MB
 * worldwide dataset became this Europe-only, simplified file).
 */
@Service
public class BorderDataService {

    private static final Logger log = LoggerFactory.getLogger(BorderDataService.class);

    @Value("${app.data.dir}")
    private String dataDir;

    private final ObjectMapper objectMapper;
    private List<BorderFeature> features = List.of();
    private int minYear;
    private int maxYear;

    public BorderDataService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() throws IOException {
        Path path = Path.of(dataDir, "cliopatria-europe.geojson");
        JsonNode root = objectMapper.readTree(path.toFile());

        List<BorderFeature> loaded = new ArrayList<>();
        for (JsonNode f : root.get("features")) {
            JsonNode props = f.get("properties");
            loaded.add(new BorderFeature(
                    loaded.size(),
                    props.path("name").asText(null),
                    props.path("fromYear").asInt(),
                    props.path("toYear").asInt(),
                    props.hasNonNull("wikipedia") ? props.get("wikipedia").asText() : null,
                    props.hasNonNull("wikidata") ? props.get("wikidata").asText() : null,
                    props.hasNonNull("areaKm2") ? props.get("areaKm2").asLong() : null,
                    f.get("geometry")
            ));
        }
        this.features = loaded;
        this.minYear = loaded.stream().mapToInt(BorderFeature::fromYear).min().orElse(0);
        this.maxYear = loaded.stream().mapToInt(BorderFeature::toYear).max().orElse(0);
        log.info("Loaded {} Cliopatria border features covering years {} to {}", loaded.size(), minYear, maxYear);
    }

    public int getMinYear() {
        return minYear;
    }

    public int getMaxYear() {
        return maxYear;
    }

    public ObjectNode getFeatureCollectionForYear(int year) {
        ArrayNode featuresArray = objectMapper.createArrayNode();
        for (BorderFeature f : features) {
            if (f.fromYear() <= year && year <= f.toYear()) {
                featuresArray.add(toGeoJsonFeature(f));
            }
        }
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        fc.set("features", featuresArray);
        return fc;
    }

    private ObjectNode toGeoJsonFeature(BorderFeature f) {
        ObjectNode feature = objectMapper.createObjectNode();
        feature.put("type", "Feature");
        feature.put("id", f.id());

        ObjectNode props = objectMapper.createObjectNode();
        putNullable(props, "name", f.name());
        props.put("fromYear", f.fromYear());
        props.put("toYear", f.toYear());
        putNullable(props, "wikipedia", f.wikipedia());
        putNullable(props, "wikidata", f.wikidata());
        if (f.areaKm2() != null) {
            props.put("areaKm2", f.areaKm2());
        } else {
            props.putNull("areaKm2");
        }
        feature.set("properties", props);
        feature.set("geometry", f.geometry());
        return feature;
    }

    private void putNullable(ObjectNode node, String field, String value) {
        if (value != null) {
            node.put(field, value);
        } else {
            node.putNull(field);
        }
    }
}
