package com.europetimemachine.backend.dto;

/**
 * Merged, UI-ready facts about a historical entity, sourced from a Wikipedia summary and
 * (where available) Wikidata time-claims.
 */
public record EntityInfo(
        String title,
        String extract,
        String thumbnailUrl,
        String wikipediaUrl,
        String inceptionYear,
        String dissolvedYear
) {
}
