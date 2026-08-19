package com.europetimemachine.backend.service;

import com.europetimemachine.backend.model.PresentDayCountry;
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
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads Natural Earth's real, survey-grade country boundaries (see
 * /data-pipeline/process-present-day.js) and serves them as the exact border layer for
 * present-day years -- Cliopatria's historical polygons are hand-digitized and inherently
 * low-resolution, so this dataset is used instead whenever the requested year is at or beyond
 * Cliopatria's own coverage.
 */
@Service
public class PresentDayBorderService {

    private static final Logger log = LoggerFactory.getLogger(PresentDayBorderService.class);

    @Value("${app.data.dir}")
    private String dataDir;

    private final ObjectMapper objectMapper;
    private List<PresentDayCountry> countries = List.of();

    public PresentDayBorderService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() throws IOException {
        Path path = Path.of(dataDir, "present-day-europe.geojson");
        JsonNode root = objectMapper.readTree(path.toFile());

        List<PresentDayCountry> loaded = new ArrayList<>();
        for (JsonNode f : root.get("features")) {
            JsonNode props = f.get("properties");
            loaded.add(new PresentDayCountry(
                    loaded.size(),
                    props.path("name").asText(null),
                    props.path("formalName").asText(null),
                    props.hasNonNull("isoA2") ? props.get("isoA2").asText() : null,
                    props.hasNonNull("wikidata") ? props.get("wikidata").asText() : null,
                    props.hasNonNull("areaKm2") ? props.get("areaKm2").asLong() : null,
                    f.get("geometry")
            ));
        }
        this.countries = loaded;
        log.info("Loaded {} present-day countries (Natural Earth 10m admin-0)", loaded.size());
    }

    /** The real current year -- computed live, not cached, so it stays correct across days. */
    public static int currentYear() {
        return Year.now().getValue();
    }

    public ObjectNode getFeatureCollection(int year) {
        ArrayNode featuresArray = objectMapper.createArrayNode();
        for (PresentDayCountry c : countries) {
            featuresArray.add(toGeoJsonFeature(c, year));
        }
        ObjectNode fc = objectMapper.createObjectNode();
        fc.put("type", "FeatureCollection");
        fc.set("features", featuresArray);
        return fc;
    }

    private ObjectNode toGeoJsonFeature(PresentDayCountry c, int year) {
        ObjectNode feature = objectMapper.createObjectNode();
        feature.put("type", "Feature");
        feature.put("id", c.id());

        ObjectNode props = objectMapper.createObjectNode();
        putNullable(props, "name", c.name());
        props.put("fromYear", year);
        props.put("toYear", year);
        // Natural Earth's common NAME is, for virtually every country, also its English
        // Wikipedia article title, so it doubles as the wikipedia lookup key.
        putNullable(props, "wikipedia", c.name());
        putNullable(props, "wikidata", c.wikidata());
        putNullable(props, "formalName", c.formalName());
        putNullable(props, "isoA2", c.isoA2());
        if (c.areaKm2() != null) {
            props.put("areaKm2", c.areaKm2());
        } else {
            props.putNull("areaKm2");
        }
        feature.set("properties", props);
        feature.set("geometry", c.geometry());
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
