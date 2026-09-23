// Never leak password hashes or internal fields to the client.
const publicUser = (u) =>
  u && {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    bio: u.bio,
    location: u.location,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };

// Subset that is safe to show to other members (no email).
const memberCard = (u) => u && { id: u.id, name: u.name, bio: u.bio, location: u.location, createdAt: u.createdAt };

module.exports = { publicUser, memberCard };
