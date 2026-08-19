# --- Build stage -------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
# Warm the local Maven repo cache from just the POM before copying source, so source-only
# changes don't force re-downloading every dependency on the next build.
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

# --- Runtime stage -------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# The preprocessed GeoJSON the app loads at startup (see application.properties'
# app.data.dir=data-cache/processed) -- committed to the repo rather than regenerated on every
# build; see data-pipeline/README or the deploy plan for why.
COPY data-cache/processed ./data-cache/processed

# Render (and most free PaaS hosts) inject PORT at runtime; application.properties already
# reads it via server.port=${PORT:8080}. MaxRAMPercentage sizes the heap relative to whatever
# memory limit the container is actually given, rather than a fixed -Xmx that wouldn't adapt.
ENTRYPOINT ["sh", "-c", "java -XX:MaxRAMPercentage=75 -jar app.jar"]
