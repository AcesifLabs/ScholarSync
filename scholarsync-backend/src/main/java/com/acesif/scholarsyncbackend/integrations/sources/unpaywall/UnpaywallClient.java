package com.acesif.scholarsyncbackend.integrations.sources.unpaywall;

import com.acesif.scholarsyncbackend.integrations.sources.utils.SourceHttpFactory;
import com.acesif.scholarsyncbackend.commons.config.properties.ExternalSourcesProperties;
import com.acesif.scholarsyncbackend.integrations.sources.dtos.*;
import com.acesif.scholarsyncbackend.integrations.sources.enums.*;
import com.acesif.scholarsyncbackend.integrations.sources.utils.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tools.jackson.databind.JsonNode;


/**
 * Unpaywall: the best open-access PDF for one DOI. Off unless external.unpaywall.enabled is true and a contact email
 * is set, because its commercial terms are unconfirmed (ADR 0005).
 */
@Service
public class UnpaywallClient {

  public static final String SERVICE = "Unpaywall";

  private final SourceHttp http;
  private final ExternalSourcesProperties properties;

  public UnpaywallClient(ExternalSourcesProperties properties) {
    this.properties = properties;
    this.http = SourceHttpFactory.http(SERVICE, properties, properties.getUnpaywall(), SourceHttpFactory::json);
  }

  public boolean enabled() {
    return properties.getUnpaywall().isEnabled() && StringUtils.hasText(properties.getContactEmail());
  }

  /** PDF URL of the best open-access copy, or null. A null is cached too, so papers without one are not re-asked. */
  @Cacheable(cacheNames = "unpaywall-pdf", sync = true)
  public String pdfUrl(String doi) {
    if (!enabled()) return null;
    JsonNode body = http.getOrNull(b -> b.pathSegment("v2").pathSegment(doi.split("/"))
            .queryParam("email", properties.getContactEmail()).build(), JsonNode.class);
    return body == null ? null : Json.str(body.path("best_oa_location").path("url_for_pdf"));
  }
}
