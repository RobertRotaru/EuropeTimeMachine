package com.europetimemachine.backend.controller;

import com.europetimemachine.backend.service.BorderDataService;
import com.europetimemachine.backend.service.ComparisonMapService;
import com.europetimemachine.backend.service.DisputedTerritoryService;
import com.europetimemachine.backend.service.PresentDayBorderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.JsonNode;

import java.nio.file.Path;

import static com.europetimemachine.backend.support.TestData.*;
import static org.assertj.core.api.Assertions.assertThat;

/** Routing rules between the historical (Cliopatria) and present-day (Natural Earth) layers. */
class BorderControllerTest {

    @TempDir
    Path dataDir;

    private BorderController controller;

    @BeforeEach
    void setUp() throws Exception {
        write(dataDir, "cliopatria-europe.geojson", featureCollection(
                polity("Kingdom of Castile", 1065, 1715, "Q179293"),
                polity("Kingdom of Spain", 1716, 2024, "Q29")));
        write(dataDir, "present-day-europe.geojson", featureCollection(country("Spain", "ES")));
        write(dataDir, "historical-basemaps-europe.json",
                "{\"1492\":" + featureCollection(country("Castile", "XX")) + "}");

        controller = new BorderController(
                load(new BorderDataService(MAPPER), dataDir),
                load(new PresentDayBorderService(MAPPER), dataDir),
                new DisputedTerritoryService(MAPPER), // not needed for historical years
                load(new ComparisonMapService(MAPPER), dataDir));
    }

    @Test
    void historicalYearServesCliopatria() {
        JsonNode props = controller.borders(1500).get("features").get(0).get("properties");
        assertThat(props.get("name").asText()).isEqualTo("Kingdom of Castile");
        assertThat(props.has("isoA2")).isFalse();
    }

    @Test
    void yearAtEndOfCoverageSwitchesToPresentDayLayer() {
        JsonNode props = controller.borders(2024).get("features").get(0).get("properties");
        assertThat(props.get("isoA2").asText()).isEqualTo("ES");
    }

    @Test
    void disputedLayerIsEmptyForHistoricalYears() {
        assertThat(controller.disputed(1500).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    void compareReturnsNearestSnapshotYear() {
        var response = controller.compare(1500);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().snapshotYear()).isEqualTo(1492);
    }

    @Test
    void yearRangeExtendsToCurrentYear() {
        var range = controller.yearRange();
        assertThat(range.minYear()).isEqualTo(1065);
        assertThat(range.maxYear()).isEqualTo(Math.max(2024, PresentDayBorderService.currentYear()));
    }
}
