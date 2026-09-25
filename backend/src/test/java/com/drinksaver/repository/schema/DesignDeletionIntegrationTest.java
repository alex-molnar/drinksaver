package com.drinksaver.repository.schema;

import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ColorPalette;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.db.Glassware;
import com.drinksaver.service.DesignService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(DesignService.class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DesignDeletionIntegrationTest {

    // The migration persists, so this test uses its own Postgres instead of the shared test database.
    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private DataSource dataSource;
    @Autowired
    private ColorPalettesTable colorPalettesTable;
    @Autowired
    private GlasswareTable glasswareTable;
    @Autowired
    private BrandsTable brandsTable;
    @Autowired
    private ConsumptionTypesTable consumptionTypesTable;
    @Autowired
    private DesignService designService;

    @Test
    void migrationMakesReferencedDesignDeletesReturnConflict() throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            ScriptUtils.executeSqlScript(connection, new FileSystemResource("sql/foreign_keys.sql"));
        }

        ColorPalette palette = colorPalettesTable.save(new ColorPalette("Dusk", "#111", null, "#fff"));
        brandsTable.save(new Brand(UUID.randomUUID(), "Test brand", palette.getId()));
        assertThat(designService.deleteColorPalette(palette.getId())).isEqualTo(409);
        assertThat(colorPalettesTable.existsById(palette.getId())).isTrue();

        Glassware glassware = glasswareTable.save(new Glassware("Pint", "M0 0", "M1 1", null));
        ConsumptionType consumptionType = new ConsumptionType();
        consumptionType.setName("Pint");
        consumptionType.setGlasswareId(glassware.getId());
        consumptionTypesTable.save(consumptionType);
        assertThat(designService.deleteGlassware(glassware.getId())).isEqualTo(409);
        assertThat(glasswareTable.existsById(glassware.getId())).isTrue();
    }
}
