package com.acesif.scholarsyncbackend.groups.enums;

/** Declared from most to least privileged; {@link #atLeast} compares by that order. */
public enum GroupRole {
  OWNER, ADMIN, MEMBER, VIEWER;

  public boolean atLeast(GroupRole required) {
    return ordinal() <= required.ordinal();
  }
}
