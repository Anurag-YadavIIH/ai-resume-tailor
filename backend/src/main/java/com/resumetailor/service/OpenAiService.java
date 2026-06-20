package com.resumetailor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.resumetailor.config.AppProperties;
import com.resumetailor.exception.AiException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Thin wrapper around the OpenAI Chat Completions API.
 * Exposes two call styles: free-form text and strict-JSON (response_format=json_object).
 */
@Slf4j
@Service
public class OpenAiService {

    private final WebClient client;
    private final AppProperties props;
    private final ObjectMapper mapper = new ObjectMapper();

    public OpenAiService(@Qualifier("openAiWebClient") WebClient client, AppProperties props) {
        this.client = client;
        this.props = props;
    }

    /** Returns the assistant message content as plain text (quality model). */
    public String completeText(String systemPrompt, String userPrompt) {
        return extractContent(call(systemPrompt, userPrompt, false, props.getOpenai().getModel()));
    }

    /** Returns the assistant message content as plain text (fast/cheap model). */
    public String completeTextFast(String systemPrompt, String userPrompt) {
        return extractContent(call(systemPrompt, userPrompt, false, props.getOpenai().getFastModel()));
    }

    /** Returns the assistant message content parsed as a JSON object (quality model). */
    public JsonNode completeJson(String systemPrompt, String userPrompt) {
        return parseJson(call(systemPrompt, userPrompt, true, props.getOpenai().getModel()));
    }

    /** Returns the assistant message content parsed as a JSON object (fast/cheap model). */
    public JsonNode completeJsonFast(String systemPrompt, String userPrompt) {
        return parseJson(call(systemPrompt, userPrompt, true, props.getOpenai().getFastModel()));
    }

    private JsonNode parseJson(JsonNode response) {
        String content = extractContent(response);
        try {
            return mapper.readTree(content);
        } catch (Exception e) {
            log.error("Failed to parse OpenAI JSON output: {}", content, e);
            throw new AiException("The AI returned malformed JSON. Please retry.", e);
        }
    }

    private JsonNode call(String systemPrompt, String userPrompt, boolean jsonMode, String model) {
        if (props.getOpenai().getApiKey() == null || props.getOpenai().getApiKey().isBlank()) {
            throw new AiException("OPENAI_API_KEY is not configured on the server.");
        }
        ObjectNode body = mapper.createObjectNode();
        body.put("model", model);
        // gpt-5 family models only support the default temperature (1) via Chat Completions
        if (!model.startsWith("gpt-5")) {
            body.put("temperature", 0.3);
        }

        ArrayNode messages = body.putArray("messages");
        ObjectNode sys = messages.addObject();
        sys.put("role", "system");
        sys.put("content", systemPrompt);
        ObjectNode usr = messages.addObject();
        usr.put("role", "user");
        usr.put("content", userPrompt);

        if (jsonMode) {
            ObjectNode format = body.putObject("response_format");
            format.put("type", "json_object");
        }

        try {
            return client.post()
                    .uri("/chat/completions")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(props.getOpenai().getTimeoutSeconds()))
                    // Retry transient connection-level failures (DNS/TLS hiccups), not API error responses
                    .retryWhen(Retry.backoff(2, Duration.ofMillis(500))
                            .filter(ex -> ex instanceof WebClientRequestException))
                    .block();
        } catch (WebClientResponseException e) {
            log.error("OpenAI API error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new AiException("OpenAI request failed: " + e.getStatusCode() + " " + e.getResponseBodyAsString());
        } catch (Exception e) {
            throw new AiException("OpenAI request failed: " + e.getMessage(), e);
        }
    }

    private String extractContent(JsonNode response) {
        JsonNode content = response.path("choices").path(0).path("message").path("content");
        if (content.isMissingNode() || content.isNull()) {
            throw new AiException("OpenAI returned an empty response.");
        }
        return content.asText();
    }
}
