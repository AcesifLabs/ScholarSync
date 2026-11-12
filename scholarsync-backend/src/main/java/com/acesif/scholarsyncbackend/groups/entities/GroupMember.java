package com.acesif.scholarsyncbackend.groups.entities;

import com.acesif.scholarsyncbackend.groups.enums.GroupRole;
import com.acesif.scholarsyncbackend.users.entities.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.domain.Persistable;

import java.time.Instant;

@Entity
@Table(name = "group_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMember implements Persistable<GroupMemberId> {

  @EmbeddedId
  private GroupMemberId id;

  @MapsId("userId")
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id")
  private User user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private GroupRole role;

  @Column(nullable = false, updatable = false)
  private Instant joinedAt;

  /** Assigned ids: without this, save() would SELECT before every INSERT to tell new from existing. */
  @Transient
  @Builder.Default
  private boolean isNew = true;

  @Override
  public boolean isNew() {
    return isNew;
  }

  @PostLoad
  @PostPersist
  void markStored() {
    isNew = false;
  }
}
