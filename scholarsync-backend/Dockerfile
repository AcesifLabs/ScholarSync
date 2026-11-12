# Build stage: dependencies are resolved in their own layer so source edits don't re-download them.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew dependencies --no-daemon -q > /dev/null
COPY src src
RUN ./gradlew bootJar --no-daemon -x test && cp build/libs/*.jar app.jar

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --no-create-home scholarsync
COPY --from=build /workspace/app.jar app.jar
USER scholarsync
EXPOSE 9000
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
