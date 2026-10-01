package com.drinksaver.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.MapConfigurationPropertySource;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RepositoryConfigurationTest {

    @Test
    void bindsConfiguredAdminUuid() {
        UUID admin = UUID.fromString("00000000-0000-0000-0000-000000000001");
        Binder binder = new Binder(new MapConfigurationPropertySource(
                Map.of("repository.admin-user-uuid", admin.toString())));

        assertThat(binder.bind("repository", RepositoryConfiguration.class).get().adminUserUUID())
                .isEqualTo(admin);
    }
}
