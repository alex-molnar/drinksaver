package com.drinksaver.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class AdminRecommendationsCacheIntegrationTest {
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired MockMvc mockMvc;

    @Test
    void warmConsumerCacheTracksCreatedRenamedAndDeletedDefaultRecommendations() throws Exception {
        UUID userId = UUID.randomUUID();
        var consumer = jwt().jwt((token) -> token.subject(userId.toString()));
        var admin = jwt().authorities(new SimpleGrantedAuthority("GROUP_/admin"));

        mockMvc.perform(get("/v1/recommendations/list").with(consumer)).andExpect(status().isOk());
        MvcResult created = mockMvc.perform(post("/v1/admin/recommendations").with(admin)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Cache test\",\"alcoholTypeId\":1,\"colorPaletteId\":1,\"glasswareId\":1}"))
            .andExpect(status().isOk()).andReturn();
        int id = new com.fasterxml.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString()).get("id").asInt();
        mockMvc.perform(get("/v1/recommendations/list").with(consumer))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Cache test')]").isNotEmpty());

        mockMvc.perform(patch("/v1/admin/recommendations/edit").with(admin).contentType(MediaType.APPLICATION_JSON)
                .content("[{\"id\":" + id + ",\"name\":\"Renamed cache test\"}]"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/v1/recommendations/list").with(consumer))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Renamed cache test')]").isNotEmpty());

        mockMvc.perform(delete("/v1/admin/recommendations/{id}", id).with(admin)).andExpect(status().isOk());
        mockMvc.perform(get("/v1/recommendations/list").with(consumer))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Renamed cache test')]").isEmpty());
    }
}
