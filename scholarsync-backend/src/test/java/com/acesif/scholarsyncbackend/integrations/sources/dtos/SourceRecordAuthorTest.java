package com.acesif.scholarsyncbackend.integrations.sources.dtos;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SourceRecordAuthorTest {

  @Test
  void familyCommaGivenBecomesGivenFamily() {
    assertThat(new SourceRecord.Author(null, "Cheng, Zelei").name()).isEqualTo("Zelei Cheng");
  }

  @Test
  void leavesOtherNamesAlone() {
    assertThat(new SourceRecord.Author(null, "Jiahao Yu").name()).isEqualTo("Jiahao Yu");
    assertThat(new SourceRecord.Author(null, "Smith, J., Jr.").name()).isEqualTo("Smith, J., Jr.");
    assertThat(new SourceRecord.Author(null, "Consortium,").name()).isEqualTo("Consortium,");
    assertThat(new SourceRecord.Author(null, null).name()).isNull();
  }
}
