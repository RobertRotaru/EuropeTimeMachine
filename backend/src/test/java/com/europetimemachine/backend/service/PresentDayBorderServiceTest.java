package com.europetimemachine.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

import java.nio.file.Path;
import java.time.Year;

import static com.europetimemachine.backend.support.TestData.*;
import static org.assertj.core.api.Assertions.assertThat;

class PresentDayBorderServiceTest {

    @TempDir
    Path dataDir;

    @Test
    void stampsEveryCountryWithRequestedYear() throws Exception {
        write(dataDir, "present-day-europe.geojson",
                featureCollection(country("Spain", "ES"), country("Romania", "RO")));
        PresentDayBorderService service = load(new PresentDayBorderService(MAPPER), dataDir);

        ObjectNode fc = service.getFeatureCollection(2026);

        assertThat(fc.get("features").size()).isEqualTo(2);
        JsonNode spain = fc.get("features").get(0).get("properties");
        assertThat(spain.get("fromYear").asInt()).isEqualTo(2026);
        assertThat(spain.get("toYear").asInt()).isEqualTo(2026);
        assertThat(spain.get("isoA2").asText()).isEqualTo("ES");
        // Natural Earth's common name doubles as the Wikipedia lookup key
        assertThat(spain.get("wikipedia").asText()).isEqualTo("Spain");
        assertThat(spain.get("areaKm2").isNull()).isTrue();
    }

    @Test
    void currentYearIsLive() {
        assertThat(PresentDayBorderService.currentYear()).isEqualTo(Year.now().getValue());
    }
}
