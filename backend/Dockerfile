# Use official OpenJDK 25 base image
FROM openjdk:25-ea-jdk-slim

ARG VERSION

# Set working directory
WORKDIR /app

# Copy Maven-built JAR file
COPY target/drinksaver-backend-$VERSION.jar app.jar

# Expose port 8080
EXPOSE 8080

# Make sure curl is present for health checks or debugging
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Run the JAR file
ENTRYPOINT ["java", "-jar", "app.jar"]

