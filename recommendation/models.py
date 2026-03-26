from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "User"
    id           = Column(String, primary_key=True)
    username     = Column(String, unique=True)
    steamId      = Column(String, unique=True, nullable=True)
    authProvider = Column(String, nullable=True)
    createdAt    = Column(DateTime(timezone=True), nullable=True)
    updatedAt    = Column(DateTime(timezone=True), nullable=True)

    userGames      = relationship("UserGame", back_populates="user")
    tagPreferences = relationship("LobbyTagPreference", back_populates="user")
    memberships    = relationship("LobbyMember", back_populates="user")


class Game(Base):
    __tablename__ = "Game"
    id            = Column(String, primary_key=True)
    canonicalSlug = Column(String, unique=True)
    name          = Column(String)
    summary       = Column(String, nullable=True)
    coverUrl      = Column(String, nullable=True)

    sourceTags = relationship("GameSourceTag", back_populates="game")
    userGames  = relationship("UserGame", back_populates="game")


class GameSourceTag(Base):
    __tablename__ = "GameSourceTag"
    gameId          = Column(String, ForeignKey("Game.id"), primary_key=True)
    source          = Column(String, primary_key=True)
    externalTagId   = Column(String, primary_key=True)
    label           = Column(String)
    weight          = Column(Float, nullable=True)
    normalizedTagId = Column(String, ForeignKey("Tag.id"), nullable=True)

    game          = relationship("Game", back_populates="sourceTags")
    normalizedTag = relationship("Tag", back_populates="gameSourceTags")


class Tag(Base):
    __tablename__ = "Tag"
    id        = Column(String, primary_key=True)
    slug      = Column(String, unique=True)
    label     = Column(String)
    createdAt = Column(DateTime(timezone=True), nullable=True)
    updatedAt = Column(DateTime(timezone=True), nullable=True)

    gameSourceTags = relationship("GameSourceTag", back_populates="normalizedTag")
    preferences    = relationship("LobbyTagPreference", back_populates="tag")


class UserGame(Base):
    __tablename__ = "UserGame"
    userId          = Column(String, ForeignKey("User.id"), primary_key=True)
    gameId          = Column(String, ForeignKey("Game.id"), primary_key=True)
    owned           = Column(Boolean, default=True)
    playtimeMinutes = Column(Integer, nullable=True)
    createdAt       = Column(DateTime(timezone=True), nullable=True)
    updatedAt       = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="userGames")
    game = relationship("Game", back_populates="userGames")


class Lobby(Base):
    __tablename__ = "Lobby"
    id         = Column(String, primary_key=True)
    name       = Column(String)
    ownerId    = Column(String, ForeignKey("User.id"))
    maxPlayers = Column(Integer, nullable=True)
    createdAt  = Column(DateTime(timezone=True), nullable=True)
    updatedAt  = Column(DateTime(timezone=True), nullable=True)

    members        = relationship("LobbyMember", back_populates="lobby")
    tagPreferences = relationship("LobbyTagPreference", back_populates="lobby")


class LobbyMember(Base):
    __tablename__ = "LobbyMember"
    lobbyId  = Column(String, ForeignKey("Lobby.id"), primary_key=True)
    userId   = Column(String, ForeignKey("User.id"), primary_key=True)
    joinedAt = Column(DateTime(timezone=True), nullable=True)

    lobby = relationship("Lobby", back_populates="members")
    user  = relationship("User", back_populates="memberships")


class LobbyTagPreference(Base):
    __tablename__ = "LobbyTagPreference"
    lobbyId   = Column(String, ForeignKey("Lobby.id"), primary_key=True)
    userId    = Column(String, ForeignKey("User.id"), primary_key=True)
    tagId     = Column(String, ForeignKey("Tag.id"), primary_key=True)
    createdAt = Column(DateTime(timezone=True), nullable=True)

    lobby = relationship("Lobby", back_populates="tagPreferences")
    user  = relationship("User", back_populates="tagPreferences")
    tag   = relationship("Tag", back_populates="preferences")
