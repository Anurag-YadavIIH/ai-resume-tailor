# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q clean package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install tectonic (self-contained LaTeX engine) for PDF rendering.
# tectonic's prebuilt binary dynamically links against these font/text libs,
# which aren't present in the base JRE image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
        libgraphite2-3 libharfbuzz0b libfontconfig1 libicu70 \
    && curl -fsSL https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-gnu.tar.gz \
        -o /tmp/tectonic.tar.gz \
    && tar -xzf /tmp/tectonic.tar.gz -C /usr/local/bin \
    && rm /tmp/tectonic.tar.gz \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/target/*.jar app.jar

ENV LATEX_ENGINE=tectonic
ENV LATEX_WORKDIR=/tmp/resume-latex
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
