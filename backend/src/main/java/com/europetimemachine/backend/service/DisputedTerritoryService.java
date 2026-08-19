package com.europetimemachine.backend.service;

import com.europetimemachine.backend.model.DisputedTerritory;
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
 * Loads present-day breakaway/disputed territories (see
 * /data-pipeline/process-disputed.js) and serves them as a layer separate from the base
 * present-day country borders, so they render on top and stay visually and informationally
 * distinct instead of disappearing into whichever country holds them de jure.
 */
@Service
public class DisputedTerritoryService {

    private static final Logger log = LoggerFactory.getLogger(DisputedTerritoryService.class);

    @Value("${app.data.dir}")
    private String dataDir;

    private final ObjectMapper objectMapper;
    private List<DisputedTerritory> territories = List.of();

    public DisputedTerritoryService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() throws IOException {
        Path path = Path.of(dataDir, "disputed-territories-europe.geojson");
        JsonNode root = objectMapper.readTree(path.toFile());

        List<DisputedTerritory> loaded = new ArrayList<>();
        for (JsonNode f : root.get("features")) {
            JsonNode props = f.get("properties");
            loaded.add(new DisputedTerritory(
                    loaded.size(),
                    props.path("name").asText(null),
                    props.path("status").asText(null),
                    props.hasNonNull("wikidata") ? props.get("wikidata").asText() : null,
                    props.hasNonNull("areaKm2") ? props.get("areaKm2").asLong() : null,
                    f.get("geometry")
            ));
        }
        this.territories = loaded;
        log.info("Loaded {} disputed territories", loaded.size());
    }

    public ObjectNode getFeatureCollection(int year) {
        ArrayNode featuresArray = objectMapper.createArrayNode();
        for (DisputedTerritory t : territories) {
            featuresArray.add(toGeoJsonFeature(t, year));
        }
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        fc.set("features", featuresArray);
        return fc;
    }

    private ObjectNode toGeoJsonFeature(DisputedTerritory t, int year) {
        ObjectNode feature = objectMapper.createObjectNode();
        feature.put("type", "Feature");
        feature.put("id", t.id());

        ObjectNode props = objectMapper.createObjectNode();
        putNullable(props, "name", t.name());
        props.put("fromYear", year);
        props.put("toYear", year);
        putNullable(props, "wikipedia", t.name());
        putNullable(props, "wikidata", t.wikidata());
        putNullable(props, "status", t.status());
        if (t.areaKm2() != null) {
            props.put("areaKm2", t.areaKm2());
        } else {
            props.putNull("areaKm2");
        }
        feature.set("properties", props);
        feature.set("geometry", t.geometry());
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
