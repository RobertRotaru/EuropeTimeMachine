package com.europetimemachine.backend.service;

import com.europetimemachine.backend.dto.EntityInfo;
import tools.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Proxies + merges a Wikipedia summary and Wikidata time-claims for a historical entity,
 * keyed by the `wikipedia`/`wikidata` fields Cliopatria already attaches to each feature
 * (no fuzzy name matching needed). Results are cached in memory for the life of the process
 * since entity facts are effectively static for this app's purposes.
 */
@Service
public class EntityInfoService {

    private static final Logger log = LoggerFactory.getLogger(EntityInfoService.class);

    private final RestClient restClient;
    private final ConcurrentHashMap<String, EntityInfo> cache = new ConcurrentHashMap<>();

    public EntityInfoService(RestClient restClient) {
        this.restClient = restClient;
    }

    public EntityInfo getEntityInfo(String wikipediaTitle, String wikidataId) {
        String cacheKey = (wikipediaTitle == null ? "" : wikipediaTitle) + "|" + (wikidataId == null ? "" : wikidataId);
        return cache.computeIfAbsent(cacheKey, k -> fetch(wikipediaTitle, wikidataId));
    }

    private EntityInfo fetch(String wikipediaTitle, String wikidataId) {
        String title = wikipediaTitle;
        String extract = null;
        String thumbnailUrl = null;
        String wikipediaUrl = null;

        if (wikipediaTitle != null && !wikipediaTitle.isBlank()) {
            try {
                String encoded = URLEncoder.encode(wikipediaTitle.replace(' ', '_'), StandardCharsets.UTF_8);
                JsonNode summary = restClient.get()
                        .uri("https://en.wikipedia.org/api/rest_v1/page/summary/{title}", encoded)
                        .retrieve()
                        .body(JsonNode.class);
                if (summary != null) {
                    title = summary.path("title").asText(wikipediaTitle);
                    extract = summary.path("extract").asText(null);
                    thumbnailUrl = summary.path("thumbnail").path("source").asText(null);
                    wikipediaUrl = summary.path("content_urls").path("desktop").path("page").asText(null);
                }
            } catch (Exception e) {
                log.debug("Wikipedia lookup failed for '{}': {}", wikipediaTitle, e.getMessage());
            }
        }

        String inceptionYear = null;
        String dissolvedYear = null;
        if (wikidataId != null && !wikidataId.isBlank()) {
            try {
                JsonNode entityData = restClient.get()
                        .uri("https://www.wikidata.org/wiki/Special:EntityData/{id}.json", wikidataId)
                        .retrieve()
                        .body(JsonNode.class);
                if (entityData != null) {
                    JsonNode entity = entityData.path("entities").path(wikidataId);
                    inceptionYear = firstTimeClaimYear(entity, "P571");
                    dissolvedYear = firstTimeClaimYear(entity, "P576");
                }
            } catch (Exception e) {
                log.debug("Wikidata lookup failed for '{}': {}", wikidataId, e.getMessage());
            }
        }

        return new EntityInfo(title, extract, thumbnailUrl, wikipediaUrl, inceptionYear, dissolvedYear);
    }

    /** Wikidata time values look like "+1789-05-04T00:00:00Z" or "-0753-04-21T00:00:00Z". */
    private String firstTimeClaimYear(JsonNode entity, String property) {
        JsonNode claims = entity.path("claims").path(property);
        if (!claims.isArray() || claims.isEmpty()) {
            return null;
        }
        String raw = claims.get(0).path("mainsnak").path("datavalue").path("value").path("time").asText(null);
        if (raw == null || raw.length() < 5) {
            return null;
        }
        boolean bce = raw.startsWith("-");
        String year = raw.substring(1, 5).replaceFirst("^0+(?=\\d)", "");
        return bce ? year + " BCE" : year;
    }
}
