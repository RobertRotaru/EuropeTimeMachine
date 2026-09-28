package com.europetimemachine.backend.support;

import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Small hand-written fixtures so service tests don't depend on the 60MB production dataset. */
public final class TestData {

    public static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private static final String SQUARE =
            "{\"type\":\"Polygon\",\"coordinates\":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}";

    private TestData() {
    }

    public static String polity(String name, int from, int to, String wikidata) {
        return """
                {"type":"Feature","geometry":%s,"properties":{
                  "name":"%s","fromYear":%d,"toYear":%d,
                  "wikipedia":"%s","wikidata":"%s","areaKm2":1000}}"""
                .formatted(SQUARE, name, from, to, name, wikidata);
    }

    public static String country(String name, String iso) {
        return """
                {"type":"Feature","geometry":%s,"properties":{
                  "name":"%s","formalName":"Kingdom of %s","isoA2":"%s",
                  "wikidata":"Q1","areaKm2":null}}"""
                .formatted(SQUARE, name, name, iso);
    }

    public static String featureCollection(String... features) {
        return "{\"type\":\"FeatureCollection\",\"features\":[" + String.join(",", features) + "]}";
    }

    public static void write(Path dir, String file, String json) throws IOException {
        Files.writeString(dir.resolve(file), json);
    }

    /** Points a service at the fixture dir and runs its @PostConstruct loader. */
    public static <T> T load(T service, Path dataDir) {
        ReflectionTestUtils.setField(service, "dataDir", dataDir.toString());
        ReflectionTestUtils.invokeMethod(service, "load");
        return service;
    }
}
