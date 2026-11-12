package com.acesif.scholarsyncbackend.commons.constants;

/** Request limits shared by controllers and DTOs; plain constants so annotations can use them. */
public final class Limits {

  private Limits() {}

  /** Longest accepted paper id (merged ids such as "doi:..." included). */
  public static final int MAX_PAPER_ID_LENGTH = 200;

  /** Default page size; a String because @RequestParam defaultValue takes one. */
  public static final String DEFAULT_PAGE_SIZE = "20";

  /** Page size cap for lists read from the database. */
  public static final int MAX_PAGE_SIZE = 100;

  /** Page size cap for live source searches and short lists. */
  public static final int MAX_SMALL_PAGE_SIZE = 50;
}
