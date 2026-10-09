package com.drinksaver.config;

import com.drinksaver.security.RejectMultipartRequestsFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.config.Customizer;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) {
        http
            .cors(Customizer.withDefaults())
            .addFilterBefore(new RejectMultipartRequestsFilter(), CsrfFilter.class)
            .authorizeHttpRequests(authz -> authz
                // Health probes and Prometheus scrape the separate management port without
                // credentials. That port is served by a ClusterIP-only Service with no Ingress.
                // Keep this allowlist limited to the two exposed, read-only endpoints.
                .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/health/**", "/actuator/prometheus").permitAll()
                // SpringDoc OpenAPI endpoints
                .requestMatchers("/v3/api-docs/**").permitAll()
                .requestMatchers("/v3/api-docs.yaml").permitAll()
                .requestMatchers("/swagger-ui/**").permitAll()
                .requestMatchers("/swagger-ui.html").permitAll()
                // Custom paths (configured in application.yaml)
                .requestMatchers("/api-docs/**").permitAll()
                .requestMatchers("/api-docs.yaml").permitAll()
                // Keycloak's group mapper emits full paths, so only the top-level admin group matches
                .requestMatchers("/v1/admin/**").hasAuthority("GROUP_/admin")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            );
        return http.build();
    }

    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter groups = new JwtGrantedAuthoritiesConverter();
        groups.setAuthoritiesClaimName("groups");
        groups.setAuthorityPrefix("GROUP_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(groups);
        return converter;
    }
}
