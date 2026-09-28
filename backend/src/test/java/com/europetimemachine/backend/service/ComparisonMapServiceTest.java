package com.europetimemachine.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static com.europetimemachine.backend.support.TestData.*;
import static org.assertj.core.api.Assertions.assertThat;

class ComparisonMapServiceTest {

    @TempDir
    Path dataDir;

    private ComparisonMapService service;

    @BeforeEach
    void setUp() throws Exception {
        String fc = featureCollection(country("X", "XX"));
        write(dataDir, "historical-basemaps-europe.json",
                "{\"1500\":" + fc + ",\"1800\":" + fc + ",\"1914\":" + fc + "}");
        service = load(new ComparisonMapService(MAPPER), dataDir);
    }

    @Test
    void picksNearestSnapshot() {
        assertThat(service.findNearest(1600).orElseThrow().snapshotYear()).isEqualTo(1500);
        assertThat(service.findNearest(1700).orElseThrow().snapshotYear()).isEqualTo(1800);
        assertThat(service.findNearest(1900).orElseThrow().snapshotYear()).isEqualTo(1914);
    }

    @Test
    void clampsToClosestEdgeOutsideRange() {
        assertThat(service.findNearest(-1000).orElseThrow().snapshotYear()).isEqualTo(1500);
        assertThat(service.findNearest(2026).orElseThrow().snapshotYear()).isEqualTo(1914);
    }

    @Test
    void tieGoesToEarlierSnapshot() {
        assertThat(service.findNearest(1650).orElseThrow().snapshotYear()).isEqualTo(1500);
    }

    @Test
    void emptyWhenNoSnapshotsLoaded() {
        assertThat(new ComparisonMapService(MAPPER).findNearest(1500)).isEmpty();
    }
}
