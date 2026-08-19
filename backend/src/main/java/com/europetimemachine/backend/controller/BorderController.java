package com.europetimemachine.backend.controller;

import com.europetimemachine.backend.service.BorderDataService;
import com.europetimemachine.backend.service.ComparisonMapService;
import com.europetimemachine.backend.service.DisputedTerritoryService;
import com.europetimemachine.backend.service.PresentDayBorderService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class BorderController {

    private final BorderDataService borderDataService;
    private final PresentDayBorderService presentDayBorderService;
    private final DisputedTerritoryService disputedTerritoryService;
    private final ComparisonMapService comparisonMapService;

    public BorderController(
            BorderDataService borderDataService,
            PresentDayBorderService presentDayBorderService,
            DisputedTerritoryService disputedTerritoryService,
            ComparisonMapService comparisonMapService
    ) {
        this.borderDataService = borderDataService;
        this.presentDayBorderService = presentDayBorderService;
        this.disputedTerritoryService = disputedTerritoryService;
        this.comparisonMapService = comparisonMapService;
    }

    @GetMapping("/borders")
    public ObjectNode borders(@RequestParam int year) {
        // Cliopatria's own coverage ends at its data's max year; beyond that (including the
        // real current year, which keeps moving) there's no historical data to filter by, so
        // real-precision present-day borders are served instead.
        if (year >= borderDataService.getMaxYear()) {
            return presentDayBorderService.getFeatureCollection(year);
        }
        return borderDataService.getFeatureCollectionForYear(year);
    }

    @GetMapping("/borders/disputed")
    public ResponseEntity<ObjectNode> disputed(@RequestParam int year) {
        // Only meaningful for the present-day layer -- de facto vs. de jure control is a
        // today-specific concept here, not modeled for historical years by this dataset.
        if (year < borderDataService.getMaxYear()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(disputedTerritoryService.getFeatureCollection(year));
    }

    @GetMapping("/borders/compare")
    public ResponseEntity<CompareResponse> compare(@RequestParam int year) {
        return comparisonMapService.findNearest(year)
                .map(r -> ResponseEntity.ok(new CompareResponse(r.snapshotYear(), r.featureCollection())))
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/years/range")
    public YearRange yearRange() {
        int maxYear = Math.max(borderDataService.getMaxYear(), PresentDayBorderService.currentYear());
        return new YearRange(borderDataService.getMinYear(), maxYear);
    }

    public record CompareResponse(int snapshotYear, JsonNode featureCollection) {
    }

    public record YearRange(int minYear, int maxYear) {
    }
}
