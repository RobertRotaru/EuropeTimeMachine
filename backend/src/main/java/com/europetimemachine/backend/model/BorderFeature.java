package com.europetimemachine.backend.model;

import tools.jackson.databind.JsonNode;

/**
 * One Cliopatria polity-timestep: valid for any year where fromYear <= year <= toYear.
 */
public record BorderFeature(
        int id,
        String name,
        int fromYear,
        int toYear,
        String wikipedia,
        String wikidata,
        Long areaKm2,
        JsonNode geometry
) {
}
