package com.europetimemachine.backend.model;

import tools.jackson.databind.JsonNode;

/**
 * One present-day country from Natural Earth's 10m admin-0 dataset -- real survey-grade
 * precision and full microstate coverage, unlike Cliopatria's hand-digitized historical
 * polygons. Used as the exact border layer for the current year (see PresentDayBorderService).
 */
public record PresentDayCountry(
        int id,
        String name,
        String formalName,
        String isoA2,
        String wikidata,
        Long areaKm2,
        JsonNode geometry
) {
}
