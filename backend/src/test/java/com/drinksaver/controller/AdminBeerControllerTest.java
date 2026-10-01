package com.drinksaver.controller;

import com.drinksaver.config.SecurityConfig;
import com.drinksaver.controller.admin.AdminBeerController;
import com.drinksaver.controller.admin.AdminBeerUserController;
import com.drinksaver.model.db.BeerFlavour;
import com.drinksaver.model.db.Brand;
import com.drinksaver.model.db.ConsumptionType;
import com.drinksaver.model.dto.patch.UpdateBeerBrand;
import com.drinksaver.model.dto.patch.UpdateBeerFlavour;
import com.drinksaver.model.dto.patch.UpdateConsumptionType;
import com.drinksaver.repository.BeerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.security.autoconfigure.SecurityAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterAutoConfiguration;
import org.springframework.boot.security.autoconfigure.web.servlet.ServletWebSecurityAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {AdminBeerController.class, AdminBeerUserController.class})
@ImportAutoConfiguration({
    SecurityAutoConfiguration.class,
    ServletWebSecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@Import(SecurityConfig.class)
class AdminBeerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BeerRepository beerRepository;

    @Test
    void patchesBrandFlavourAndConsumptionTypeOrReturnsNotFound() throws Exception {
        UpdateBeerBrand brandUpdate = new UpdateBeerBrand("BrewCo", null);
        UpdateBeerFlavour flavourUpdate = new UpdateBeerFlavour("Amber", null);
        UpdateConsumptionType consumptionUpdate = new UpdateConsumptionType("Bottle", null);
        when(beerRepository.editBrand(1, brandUpdate)).thenReturn(Optional.of(new Brand(UUID.randomUUID(), "BrewCo", null)));
        when(beerRepository.editBrand(9, brandUpdate)).thenReturn(Optional.empty());
        when(beerRepository.editBeerFlavour(2, flavourUpdate)).thenReturn(Optional.of(new BeerFlavour(1, UUID.randomUUID(), "Amber")));
        when(beerRepository.editBeerFlavour(9, flavourUpdate)).thenReturn(Optional.empty());
        when(beerRepository.editConsumptionType(3, consumptionUpdate)).thenReturn(Optional.of(new ConsumptionType(3, "Bottle", null)));
        when(beerRepository.editConsumptionType(9, consumptionUpdate)).thenReturn(Optional.empty());

        mockMvc.perform(patch("/v1/admin/beer/brands/1").with(admin()).contentType(APPLICATION_JSON).content("{\"name\":\"BrewCo\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("BrewCo"));
        mockMvc.perform(patch("/v1/admin/beer/brands/9").with(admin()).contentType(APPLICATION_JSON).content("{\"name\":\"BrewCo\"}"))
            .andExpect(status().isNotFound());
        mockMvc.perform(patch("/v1/admin/beer/brands/flavours/2").with(admin()).contentType(APPLICATION_JSON).content("{\"name\":\"Amber\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Amber"));
        mockMvc.perform(patch("/v1/admin/beer/brands/flavours/9").with(admin()).contentType(APPLICATION_JSON).content("{\"name\":\"Amber\"}"))
            .andExpect(status().isNotFound());
        mockMvc.perform(patch("/v1/admin/beer/consumption-types/3").with(admin()).contentType(APPLICATION_JSON).content("{\"name\":\"Bottle\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Bottle"));
        mockMvc.perform(patch("/v1/admin/beer/consumption-types/9").with(admin()).contentType(APPLICATION_JSON).content("{\"name\":\"Bottle\"}"))
            .andExpect(status().isNotFound());

        verify(beerRepository).editBrand(1, brandUpdate);
        verify(beerRepository).editBeerFlavour(2, flavourUpdate);
        verify(beerRepository).editConsumptionType(3, consumptionUpdate);
    }

    @Test
    void publishesBrandAndFlavourOrReturnsNotFound() throws Exception {
        when(beerRepository.publishBrand(1)).thenReturn(Optional.of(new Brand(UUID.randomUUID(), "BrewCo", null)));
        when(beerRepository.publishBrand(9)).thenReturn(Optional.empty());
        when(beerRepository.publishBeerFlavour(2)).thenReturn(Optional.of(new BeerFlavour(1, UUID.randomUUID(), "Amber")));
        when(beerRepository.publishBeerFlavour(9)).thenReturn(Optional.empty());

        mockMvc.perform(post("/v1/admin/user-defined/beer/brands/1/publish").with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("BrewCo"));
        mockMvc.perform(post("/v1/admin/user-defined/beer/brands/9/publish").with(admin())).andExpect(status().isNotFound());
        mockMvc.perform(post("/v1/admin/user-defined/beer/brands/flavours/2/publish").with(admin()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Amber"));
        mockMvc.perform(post("/v1/admin/user-defined/beer/brands/flavours/9/publish").with(admin())).andExpect(status().isNotFound());
    }

    @Test
    void deletesBrandsFlavoursAndConsumptionTypes() throws Exception {
        when(beerRepository.deleteBrandById(1)).thenReturn(204);
        when(beerRepository.deleteBrandById(9)).thenReturn(404);
        when(beerRepository.deleteBeerFlavourById(2)).thenReturn(409);
        when(beerRepository.deleteConsumptionTypeById(3)).thenReturn(204);

        mockMvc.perform(delete("/v1/admin/beer/brands/1").with(admin())).andExpect(status().isNoContent());
        mockMvc.perform(delete("/v1/admin/beer/brands/9").with(admin())).andExpect(status().isNotFound());
        mockMvc.perform(delete("/v1/admin/beer/brands/flavours/2").with(admin())).andExpect(status().isConflict());
        mockMvc.perform(delete("/v1/admin/beer/consumption-types/3").with(admin())).andExpect(status().isNoContent());
        verify(beerRepository).deleteBrandById(1);
        verify(beerRepository).deleteBrandById(9);
        verify(beerRepository).deleteBeerFlavourById(2);
        verify(beerRepository).deleteConsumptionTypeById(3);
    }

    private static RequestPostProcessor admin() {
        return jwt().authorities(new SimpleGrantedAuthority("GROUP_/admin"));
    }
}
