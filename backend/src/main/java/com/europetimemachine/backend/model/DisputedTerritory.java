package com.europetimemachine.backend.model;

import tools.jackson.databind.JsonNode;

/**
 * A present-day breakaway/disputed territory (Crimea, the Donetsk/Luhansk "People's
 * Republics", Northern Cyprus, Transnistria, Abkhazia, South Ossetia) rendered as its own
 * distinctly colored region on top of the base present-day country layer -- otherwise areas
 * under de facto control different from the internationally-recognized border would silently
 * vanish into whichever country holds them de jure. See PresentDayBorderService for that base
 * layer and DisputedTerritoryService for how this is served.
 */
public record DisputedTerritory(
        int id,
        String name,
        String status,
        String wikidata,
        Long areaKm2,
        JsonNode geometry
) {
}
