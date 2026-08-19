package com.europetimemachine.backend.controller;

import com.europetimemachine.backend.service.SubdivisionService;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SubdivisionController {

    private final SubdivisionService subdivisionService;
    private final ObjectMapper objectMapper;

    public SubdivisionController(SubdivisionService subdivisionService, ObjectMapper objectMapper) {
        this.subdivisionService = subdivisionService;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/subdivisions")
    public ResponseEntity<ObjectNode> subdivisions(@RequestParam String countryCode) {
        return subdivisionService.getFeaturesForCountry(countryCode)
                .map(features -> {
                    ObjectNode fc = objectMapper.createObjectNode();
                    fc.put("type", "FeatureCollection");
                    fc.set("features", features);
                    return ResponseEntity.ok(fc);
                })
                .orElse(ResponseEntity.noContent().build());
    }
}
