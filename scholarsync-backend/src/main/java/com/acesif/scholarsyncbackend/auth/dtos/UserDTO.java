package com.acesif.scholarsyncbackend.auth.dtos;

public record UserDTO(String id, String email, String name, String avatarUrl, String provider, String orcidId) {}
