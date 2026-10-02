package com.drinksaver.controller;

import com.drinksaver.model.db.AlcoholType;
import com.drinksaver.repository.schema.AlcoholTypesTable;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
class AdminSubtypeIdentifierIntegrationTest {
    private static final UUID ADMIN = UUID.fromString("00000000-0000-0000-0000-000000000000");

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired MockMvc mockMvc;
    @Autowired AlcoholTypesTable alcoholTypes;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean JwtDecoder jwtDecoder;

    @Test
    void subtypeReturnedByCreateCanBeReadPatchedPublishedAndDeletedOverHttp() throws Exception {
        jdbc.queryForObject("SELECT setval(pg_get_serial_sequence('alcohol_subtypes', 'id'), 2147483647, true)", Long.class);
        AlcoholType parent = alcoholTypes.save(new AlcoholType(ADMIN, "Identifier parent", List.of(), 1, 1));
        MvcResult created = mockMvc.perform(post("/v1/admin/default/alcohol/types/{id}/subtypes", parent.getId()).with(admin())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"alcoholTypeId\":" + parent.getId() + ",\"name\":\"Before\",\"colorPaletteId\":1,\"glasswareId\":1}"))
            .andExpect(status().isOk()).andReturn();
        long id = new com.fasterxml.jackson.databind.ObjectMapper().readTree(created.getResponse().getContentAsString()).get("id").asLong();
        assertThat(id).isGreaterThan(Integer.MAX_VALUE);

        mockMvc.perform(get("/v1/admin/default/alcohol/types/{id}/subtypes", parent.getId()).with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id));
        mockMvc.perform(patch("/v1/admin/alcohol/subtypes/{id}", id).with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"After\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("After"));
        mockMvc.perform(post("/v1/admin/user-defined/alcohol/subtypes/{id}/publish", id).with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.userId").value(ADMIN.toString()));
        mockMvc.perform(delete("/v1/admin/alcohol/subtypes/{id}", id).with(admin()))
            .andExpect(status().isNoContent());
        mockMvc.perform(patch("/v1/admin/alcohol/subtypes/9223372036854775807").with(admin())
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Missing\"}"))
            .andExpect(status().isNotFound());
        mockMvc.perform(delete("/v1/admin/alcohol/subtypes/9223372036854775807").with(admin()))
            .andExpect(status().isNotFound());
        assertThat(created.getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void publishingAParentKeepsItsUserDefinedSubtypeUnpublished() throws Exception {
        UUID owner = UUID.randomUUID();
        MvcResult createdParent = mockMvc.perform(post("/v1/alcohol/types").with(jwt().jwt((token) -> token.subject(owner.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"User parent\",\"colorPaletteId\":1,\"glasswareId\":1}"))
            .andExpect(status().isOk()).andReturn();
        int parentId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(createdParent.getResponse().getContentAsString()).get("id").asInt();
        mockMvc.perform(post("/v1/alcohol/types/{id}/subtypes", parentId).with(jwt().jwt((token) -> token.subject(owner.toString())))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"alcoholTypeId\":" + parentId + ",\"name\":\"Unpublished child\",\"colorPaletteId\":1,\"glasswareId\":1}"))
            .andExpect(status().isOk());

        mockMvc.perform(post("/v1/admin/user-defined/alcohol/types/{id}/publish", parentId).with(admin()))
            .andExpect(status().isOk());
        mockMvc.perform(get("/v1/admin/user-defined/alcohol/types/{id}/subtypes", parentId).with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.name == 'Unpublished child')]").isNotEmpty());
        mockMvc.perform(get("/v1/admin/user-defined/alcohol/types").with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + parentId + ")]").isEmpty());
        mockMvc.perform(get("/v1/admin/default/alcohol/types").with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + parentId + ")]").isNotEmpty());
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("GROUP_/admin"));
    }
}
