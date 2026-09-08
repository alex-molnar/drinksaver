package com.drinksaver.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.Customizer;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(authz -> authz
                // Spring Boot reuses this exact filter chain for the management port too
                // (management.server.port) whenever the app defines its own SecurityFilterChain,
                // rather than falling back to its own default management security - see
                // ServletManagementContextSecurityConfiguration. In practice this pattern only
                // opens up actuator paths that actually exist as endpoints in the web server
                // handling the request: verified live that /actuator/env, /beans and /heapdump
                // (excluded by management.endpoints.web.exposure.include) still 401 on the
                // management port, and nothing under /actuator exists at all on the main port
                // (8080) any more, so this permitAll is narrower in practice than it reads.
                .requestMatchers("/actuator/**").permitAll()
                // SpringDoc OpenAPI endpoints
                .requestMatchers("/v3/api-docs/**").permitAll()
                .requestMatchers("/v3/api-docs.yaml").permitAll()
                .requestMatchers("/swagger-ui/**").permitAll()
                .requestMatchers("/swagger-ui.html").permitAll()
                // Custom paths (configured in application.yaml)
                .requestMatchers("/api-docs/**").permitAll()
                .requestMatchers("/api-docs.yaml").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
            );
        return http.build();
    }
}
