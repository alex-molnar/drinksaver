package com.drinksaver.security;

import com.drinksaver.config.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

// Real Tomcat is essential: MockMvc does not parse raw multipart part headers.
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    classes = {SecurityConfig.class, MultipartRequestIntegrationTest.TestApplication.class},
    properties = {"management.server.port=0", "server.tomcat.max-part-header-size=512B"})
@ExtendWith(OutputCaptureExtension.class)
class MultipartRequestIntegrationTest {

    @LocalServerPort
    private int port;

    @ParameterizedTest
    @CsvSource({"/probe,false", "/missing,false", "/error,false", "/probe,true"})
    void oversizedPartHeadersAreRejectedWithoutParsingOrErrorDispatch(
            String path, boolean authenticated, CapturedOutput output) throws Exception {
        String body = "--boundary\r\nContent-Disposition: form-data; name=\""
            + "a".repeat(600) + "\"\r\n\r\nvalue\r\n--boundary--\r\n";

        var response = post(path, "multipart/form-data; boundary=boundary", body, authenticated);

        assertThat(output.getAll()).doesNotContain(
            "SizeLimitExceededException", "Header section has more than", "Exception Processing [ErrorPage");
        assertThat(response.statusCode()).isEqualTo(415);
        assertThat(response.body()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"multipart/form-data", "multipart/mixed", "Multipart/Form-Data"})
    void malformedMultipartIsRejectedWithoutParsing(String contentType, CapturedOutput output) throws Exception {
        var response = post("/probe", contentType, "no boundary or valid multipart body", false);

        assertThat(output.getAll()).doesNotContain("MultipartException", "Exception Processing [ErrorPage");
        assertThat(response.statusCode()).isEqualTo(415);
    }

    @Test
    void authenticatedJsonRequestsStillWork() throws Exception {
        var response = post("/probe", "application/json", "{\"value\":1}", true);

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).isEqualTo("{\"value\":1}");
    }

    @Test
    void authenticationIsStillRequired() throws Exception {
        var response = send(request("/probe").GET().build());

        assertThat(response.statusCode()).isEqualTo(401);
    }

    @Test
    void unauthenticatedJsonRequestsAreStillRejected() throws Exception {
        var response = post("/probe", "application/json", "{}", false);

        assertThat(response.statusCode()).isEqualTo(401);
    }

    private HttpResponse<String> post(String path, String contentType, String body, boolean authenticated)
            throws Exception {
        var request = request(path).header("Content-Type", contentType);
        if (authenticated) {
            request.header("Authorization", "Bearer valid");
        }
        return send(request.POST(HttpRequest.BodyPublishers.ofString(body)).build());
    }

    private HttpRequest.Builder request(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
            .timeout(Duration.ofSeconds(10));
    }

    private HttpResponse<String> send(HttpRequest request) throws Exception {
        try (var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()) {
            return client.send(request, HttpResponse.BodyHandlers.ofString());
        }
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableAutoConfiguration(exclude = DataSourceAutoConfiguration.class)
    @Import(ProbeController.class)
    static class TestApplication {
        @Bean
        JwtDecoder jwtDecoder() {
            return token -> {
                if (!"valid".equals(token)) {
                    throw new BadJwtException("Invalid test token");
                }
                return Jwt.withTokenValue(token).header("alg", "none").subject("test-user").build();
            };
        }
    }

    @RestController
    static class ProbeController {
        @GetMapping("/probe")
        String get() {
            return "ok";
        }

        @PostMapping(value = "/probe", consumes = "application/json")
        String post(@RequestBody String body) {
            return body;
        }
    }
}
