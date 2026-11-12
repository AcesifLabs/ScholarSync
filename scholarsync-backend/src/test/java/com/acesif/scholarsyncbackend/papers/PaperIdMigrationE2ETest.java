package com.acesif.scholarsyncbackend.papers;

import com.acesif.scholarsyncbackend.integrations.sources.utils.PaperKeys;
import com.acesif.scholarsyncbackend.support.E2ETestBase;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** V9 on a database seeded at V8: Semantic Scholar ids become doi:/arxiv: keys and every reference follows. */
class PaperIdMigrationE2ETest extends E2ETestBase {

  @Test
  void legacyIdsAreRewrittenAndReferencesCascade() {
    String database = "migration_" + UUID.randomUUID().toString().replace("-", "");
    jdbc.execute("CREATE DATABASE " + database);
    DriverManagerDataSource dataSource = new DriverManagerDataSource(
            POSTGRES.getJdbcUrl().replaceFirst("/[^/?]+(\\?|$)", "/" + database + "$1"), POSTGRES.getUsername(), POSTGRES.getPassword());
    JdbcTemplate db = new JdbcTemplate(dataSource);

    Flyway.configure().dataSource(dataSource).target("8").load().migrate();
    UUID user = db.queryForObject("INSERT INTO users (email) VALUES ('m@example.com') RETURNING id", UUID.class);
    db.update("""
            INSERT INTO papers (id, title, external_ids) VALUES
              ('s2doi', 'Has DOI', '{"DOI":"https://doi.org/10.1000/ABC","PubMed":"123","CorpusId":1}'),
              ('s2arxiv', 'Preprint', '{"DOI":"10.48550/arXiv.2101.00001","ArXiv":"2101.00001v2"}'),
              ('s2bare', 'No ids', NULL),
              ('s2sici', 'Semicolon DOI', '{"DOI":"10.1002/(SICI)1097-0258(19980430)17:8<857::AID-SIM777>3.0.CO;2-E"}')
            """);
    db.update("INSERT INTO library_items (user_id, paper_id) VALUES (?, 's2doi'), (?, 's2arxiv'), (?, 's2bare')", user, user, user);
    UUID group = db.queryForObject("INSERT INTO reading_groups (name, owner_id) VALUES ('G', ?) RETURNING id", UUID.class, user);
    db.update("INSERT INTO group_activity (group_id, actor_id, type, paper_id) VALUES (?, ?, 'PAPER_ADDED', 's2doi'), (?, ?, 'PAPER_ADDED', 's2bare')",
            group, user, group, user);

    Flyway.configure().dataSource(dataSource).load().migrate();

    assertThat(db.queryForList("SELECT paper_id FROM library_items ORDER BY paper_id", String.class))
            .containsExactly("arxiv:2101.00001", "doi:10.1000~abc", "s2bare");
    assertThat(db.queryForMap("SELECT doi, pmid, sources FROM papers WHERE id = 'doi:10.1000~abc'"))
            .containsEntry("doi", "10.1000/abc").containsEntry("pmid", "123");
    assertThat(db.queryForObject("SELECT doi FROM papers WHERE id = 'arxiv:2101.00001'", String.class)).isNull();
    assertThat(db.queryForObject("SELECT count(*) FROM search_cache", Integer.class)).isZero();
    // group_activity has no foreign key, so V9 rewrites it itself
    assertThat(db.queryForList("SELECT paper_id FROM group_activity ORDER BY paper_id", String.class))
            .containsExactly("doi:10.1000~abc", "s2bare");
    // a DOI with ';' (rejected by the HTTP firewall) gets the same doi64 id the application computes
    String sici = "10.1002/(sici)1097-0258(19980430)17:8<857::aid-sim777>3.0.co;2-e";
    assertThat(db.queryForObject("SELECT id FROM papers WHERE doi = ?", String.class, sici))
            .isEqualTo(PaperKeys.idFor(sici, null, null, null)).startsWith("doi64:");
  }
}
