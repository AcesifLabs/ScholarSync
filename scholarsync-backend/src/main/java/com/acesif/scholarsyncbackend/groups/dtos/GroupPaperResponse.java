package com.acesif.scholarsyncbackend.groups.dtos;

import com.acesif.scholarsyncbackend.papers.dtos.PaperSummary;
import com.acesif.scholarsyncbackend.users.dtos.UserRef;

import java.time.Instant;

public record GroupPaperResponse(PaperSummary paper, UserRef addedBy, Instant addedAt) {}
