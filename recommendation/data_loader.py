import numpy as np
import pandas as pd
from sqlalchemy.orm import Session, joinedload
from models import Game, GameSourceTag, UserGame, LobbyMember, LobbyTagPreference


def get_games_dataframe(db: Session) -> pd.DataFrame:
    """
    Gets the game list with their tags from the database.
    
    Parameters
    ----------
    db : Session
        SQLAlchemy session used to interact with the database.

    Returns
    -------
    pd.DataFrame
        Dataframe of the games and their associated tags
        Columns : game_id | name | slug | tags (strings separated with spaces)
    """
    games = db.query(Game).options(
        joinedload(Game.sourceTags).joinedload(GameSourceTag.normalizedTag)
    ).all()
    rows = []
    for game in games:
        tag_labels = []
        for source_tag in game.sourceTags:
            if source_tag.normalizedTag:
                slug = source_tag.normalizedTag.slug
            else:
                slug = source_tag.label.lower().replace(" ", "-")
            weight = source_tag.weight or 1.0
            repetitions = max(1, round(weight))
            tag_labels.extend([slug] * repetitions)
        rows.append({
            "game_id": game.id,
            "name":    game.name,
            "slug":    game.canonicalSlug,
            "tags":    " ".join(tag_labels),
        })
    df = pd.DataFrame(rows)
    df = df.drop_duplicates("game_id")
    df = df.dropna(subset=["game_id", "tags"])
    df = df[df["tags"].str.strip() != ""]
    return df


def get_interactions_dataframe(db: Session, user_ids: list[str]) -> pd.DataFrame:
    """
    Get the libraries of the users in the lobby.
    
    Parameters
    ----------
    db: Session
        SQLAlchemy session
    user_ids: list[str]
        Users in the lobby
        
    Returns
    -------
    pd.DataFrame
        Dataframe of libraries of the users
        Columns : user_id | game_id | interaction (float normalized between 0 and 1)
    """
    user_games = db.query(UserGame).filter(
        UserGame.userId.in_(user_ids),
        UserGame.owned == True
    ).all()
    rows = [
        {
            "user_id":     ug.userId,
            "game_id":     ug.gameId,
            "playtime":    ug.playtimeMinutes or 0,
        }
        for ug in user_games
    ]
    if not rows:
        return pd.DataFrame(columns=["user_id", "game_id", "interaction"])
    df = pd.DataFrame(rows)
    max_playtime = df["playtime"].max()
    if max_playtime > 0:
        log_max = np.log1p(max_playtime)
        df["interaction"] = df["playtime"].apply(
            lambda t: 0.1 + 0.9 * (np.log1p(t) / log_max)
        )
    else:
        df["interaction"] = 0.1
    return df[["user_id", "game_id", "interaction"]]


def get_all_interactions_dataframe(db: Session) -> pd.DataFrame:
    """
    Get all the users libraries.
    
    Parameters
    ----------
    db: Session
        SQLAlchemy session

    Returns
    -------
    pd.DataFrame
        Dataframe of the whole libraries
        Columns : user_id | game_id | interaction (float normalized between 0 and 1)
    """
    user_games = db.query(UserGame).filter(UserGame.owned == True).all()
    rows = [
        {
            "user_id":  ug.userId,
            "game_id":  ug.gameId,
            "playtime": ug.playtimeMinutes or 0,
        }
        for ug in user_games
    ]
    if not rows:
        return pd.DataFrame(columns=["user_id", "game_id", "interaction"])
    df = pd.DataFrame(rows)
    max_playtime = df["playtime"].max()
    if max_playtime > 0:
        log_max = np.log1p(max_playtime)
        df["interaction"] = df["playtime"].apply(
            lambda t: 0.1 + 0.9 * (np.log1p(t) / log_max)
        )
    else:
        df["interaction"] = 0.1
    return df[["user_id", "game_id", "interaction"]]


def get_lobby_context(db: Session, lobby_id: str) -> dict:
    """
    Get the id of the users in the lobby and their associated tags.
    
    Parameters
    ----------
    db: Session
        SQLAlchemy session
    lobby_id: str
        Ids of the users in the lobby

    Returns
    -------
    dict
        {"user_ids","selected_tags_by_user","all_selected_tags"}
    """
    members = db.query(LobbyMember).filter(
        LobbyMember.lobbyId == lobby_id
    ).all()
    user_ids = [m.userId for m in members]

    tag_prefs = db.query(LobbyTagPreference).options(
        joinedload(LobbyTagPreference.tag)
    ).filter(
        LobbyTagPreference.lobbyId == lobby_id
    ).all()
    selected_tags_by_user: dict[str, list[str]] = {}
    for pref in tag_prefs:
        selected_tags_by_user.setdefault(pref.userId, []).append(
            pref.tag.slug
        )
    all_selected_tags = list({
        tag
        for tags in selected_tags_by_user.values()
        for tag in tags
    })

    return {
        "user_ids":              user_ids,
        "selected_tags_by_user": selected_tags_by_user,
        "all_selected_tags":     all_selected_tags,
    }
