# 0002 Flyway owns the schema

Hibernate `ddl-auto: update` is replaced by Flyway migrations with `ddl-auto: validate`. Each `V<n>__*.sql` has a matching `db/rollback/U<n>__*.sql`, run by hand with `psql -f` because Flyway Community does not run undo migrations. The switch needs a one-time reset of the local database. No production data exists.
