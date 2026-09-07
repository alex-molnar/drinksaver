# Local development only. The shipped backend/Dockerfile copies a jar that
# Maven has already produced in CI; this one builds from source so that
# `docker compose up --build` needs nothing on the host but Docker.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -B --no-transfer-progress dependency:go-offline
COPY src ./src
# Tests run in CI and through `mvn test`. Skipping them here keeps the stack
# quick to start and avoids needing a Docker daemon inside the build.
RUN mvn -B --no-transfer-progress package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && apt-get clean \
 && find /var/lib/apt/lists -mindepth 1 -delete
COPY --from=build /src/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
