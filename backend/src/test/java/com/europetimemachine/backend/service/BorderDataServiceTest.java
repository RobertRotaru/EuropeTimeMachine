package com.europetimemachine.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static com.europetimemachine.backend.support.TestData.*;
import static org.assertj.core.api.Assertions.assertThat;

class BorderDataServiceTest {

    @TempDir
    Path dataDir;

    private BorderDataService service;

    @BeforeEach
    void setUp() throws Exception {
        write(dataDir, "cliopatria-europe.geojson", featureCollection(
                polity("Roman Empire", -27, 476, "Q2277"),
                polity("Byzantine Empire", 395, 1453, "Q12544"),
                polity("Ottoman Empire", 1299, 1922, "Q12560")));
        service = load(new BorderDataService(MAPPER), dataDir);
    }

    @Test
    void computesYearRangeFromData() {
        assertThat(service.getMinYear()).isEqualTo(-27);
        assertThat(service.getMaxYear()).isEqualTo(1922);
    }

    @Test
    void returnsOnlyPolitiesActiveInRequestedYear() {
        assertThat(names(service.getFeatureCollectionForYear(400)))
                .containsExactlyInAnyOrder("Roman Empire", "Byzantine Empire");
        assertThat(names(service.getFeatureCollectionForYear(1400)))
                .containsExactlyInAnyOrder("Byzantine Empire", "Ottoman Empire");
    }

    @Test
    void yearRangeIsInclusiveOnBothEnds() {
        assertThat(names(service.getFeatureCollectionForYear(476))).contains("Roman Empire");
        assertThat(names(service.getFeatureCollectionForYear(477))).doesNotContain("Roman Empire");
        assertThat(names(service.getFeatureCollectionForYear(-27))).containsExactly("Roman Empire");
    }

    @Test
    void emptyCollectionOutsideCoverage() {
        ObjectNode fc = service.getFeatureCollectionForYear(-500);
        assertThat(fc.get("type").asText()).isEqualTo("FeatureCollection");
        assertThat(fc.get("features").size()).isZero();
    }

    @Test
    void emitsValidGeoJsonFeatures() {
        JsonNode feature = service.getFeatureCollectionForYear(1500).get("features").get(0);
        assertThat(feature.get("type").asText()).isEqualTo("Feature");
        assertThat(feature.get("geometry").get("type").asText()).isEqualTo("Polygon");
        assertThat(feature.get("properties").get("wikidata").asText()).isEqualTo("Q12560");
        assertThat(feature.get("properties").get("areaKm2").asLong()).isEqualTo(1000L);
    }

    private static List<String> names(ObjectNode fc) {
        List<String> names = new ArrayList<>();
        fc.get("features").forEach(f -> names.add(f.get("properties").get("name").asText()));
        return names;
    }
}
