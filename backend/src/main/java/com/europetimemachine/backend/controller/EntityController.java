package com.europetimemachine.backend.controller;

import com.europetimemachine.backend.dto.EntityInfo;
import com.europetimemachine.backend.service.EntityInfoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class EntityController {

    private final EntityInfoService entityInfoService;

    public EntityController(EntityInfoService entityInfoService) {
        this.entityInfoService = entityInfoService;
    }

    @GetMapping("/entity")
    public EntityInfo entity(@RequestParam(required = false) String wikipedia,
                              @RequestParam(required = false) String wikidata) {
        return entityInfoService.getEntityInfo(wikipedia, wikidata);
    }
}
