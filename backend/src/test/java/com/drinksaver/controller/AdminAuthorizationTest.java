package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.controller.admin.AdminRecommendationsController;
import com.drinksaver.repository.AdminRecommendationsRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pins the {@code /v1/admin/**} rule against the real {@code groups} claim converter in
 * {@link SecurityConfig}. A bearer token is sent instead of using the {@code jwt()} post-processor,
 * because that post-processor supplies its own authorities and would bypass the converter.
 * Keycloak runs its group mapper with full paths on, so the admin group arrives as {@code /admin}.
 */
@WebMvcTest(AdminRecommendationsController.class)
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import({SecurityConfig.class, AdminAuthorizationTest.GroupsTokenDecoder.class})
class AdminAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdminRecommendationsRepository adminRecommendationsRepository;

    @ParameterizedTest
    @CsvSource({
        "/admin, 200",
        "admin, 403",
        "/customers/admin, 403",
        "/other, 403",
        "none, 403"
    })
    void onlyTheTopLevelAdminGroupReachesAdminEndpoints(String group, int expectedStatus) throws Exception {
        mockMvc.perform(get("/v1/admin/recommendations/list").header("Authorization", "Bearer " + group))
            .andExpect(status().is(expectedStatus));
    }

    /** Treats the bearer token value as the single group in the {@code groups} claim; "none" means no claim. */
    static class GroupsTokenDecoder {
        @Bean
        JwtDecoder jwtDecoder() {
            return token -> {
                Jwt.Builder jwt = Jwt.withTokenValue(token).header("alg", "none").subject("test-user");
                if (!"none".equals(token)) {
                    jwt.claim("groups", List.of(token));
                }
                return jwt.build();
            };
        }
    }
}
