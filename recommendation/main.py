import numpy as np
from collections import Counter
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from implicit.als import AlternatingLeastSquares
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from db import get_db
from data_loader import (
    get_games_dataframe,
    get_interactions_dataframe,
    get_all_interactions_dataframe,
    get_lobby_context,
)

app = FastAPI()


# ALPHA is the maximum weight for the collaborative score
# If the user's library has less than 5 games, ALPHA = 0, if more than 20, ALPHA = 0.4
ALPHA = 0.4
ALPHA_MIN_GAMES  = 5
ALPHA_MAX_GAMES  = 20


def normalize(arr: np.ndarray) -> np.ndarray:
    """
    Normalizes a vector between 0 and 1.

    Parameters
    ----------
    arr : np.ndarray
        The vector to normalize

    Returns
    -------
    np.darray
        The normalized vector, zeros if the vector is constant
    """
    min_val, max_val = arr.min(), arr.max()
    if max_val == min_val:
        return np.zeros_like(arr)
    return (arr - min_val) / (max_val - min_val)


def compute_alpha_for_user(nb_games_in_library: int, als_available: bool) -> float:
    """
    Calculates the ALPHA for a user.

    Parameters
    ----------
    nb_games_in_library: int
        The number of games a user has in his library
    als_available: bool
        True if enough global users

    Returns
    -------
    float
        The ALPHA of a user
    """
    if not als_available or nb_games_in_library < ALPHA_MIN_GAMES:
        return 0.0
    if nb_games_in_library >= ALPHA_MAX_GAMES:
        return ALPHA
    progress = (nb_games_in_library - ALPHA_MIN_GAMES) / (ALPHA_MAX_GAMES - ALPHA_MIN_GAMES)
    return ALPHA * progress


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/recommend/{lobby_id}")
def recommend(lobby_id: str, nb_recommendations: int = 10, db: Session = Depends(get_db)):
    """
    Recommends a list of games for a lobby.

    Parameters
    ----------
    lobby_id : str
        ID of the lobby to recommend
    nb_recommendations
        Number of recommended games (optionnal, default 10)

    Returns
    -------
    lobby_id
    nb_players
    selected_tags
    alpha_per_user
    recommendations
    """
    lobby = get_lobby_context(db, lobby_id)
    if not lobby["user_ids"]:
        raise HTTPException(status_code=404, detail="Lobby not found or empty")
    games_df            = get_games_dataframe(db)
    lobby_interactions  = get_interactions_dataframe(db, lobby["user_ids"])
    all_interactions    = get_all_interactions_dataframe(db)

    games_df = games_df.drop_duplicates("game_id").dropna(subset=["game_id", "tags"])
    games_df = games_df[games_df["tags"].str.strip() != ""].reset_index(drop=True)

    tfidf = TfidfVectorizer()
    tag_matrix = tfidf.fit_transform(games_df["tags"])  # shape : (nb_jeux, nb_tags_uniques)
    similarity_matrix = cosine_similarity(tag_matrix)   # shape : (nb_jeux, nb_jeux)
    game_id_to_idx = {gid: i for i, gid in enumerate(games_df["game_id"])}

    def content_score_for_user(user_id: str) -> np.ndarray:
        """
        Calculates the content-based scores of a user, for each game of his library.

        Parameters
        ----------
        user_id : str
            ID of the user

        Returns
        -------
        np.darray
            Matrix of the content-based scores
        """
        user_owned = lobby_interactions[lobby_interactions["user_id"] == user_id]
        user_owned = user_owned[user_owned["game_id"].isin(game_id_to_idx)]
        if user_owned.empty:
            return np.zeros(len(games_df))
        scores       = np.zeros(len(games_df))
        total_weight = 0.0
        for _, row in user_owned.iterrows():
            idx = game_id_to_idx[row["game_id"]]
            w = row["interaction"]
            scores += w * similarity_matrix[idx]
            total_weight += w
        return scores / total_weight if total_weight > 0 else scores


    content_scores_per_user = np.array([
        content_score_for_user(uid) for uid in lobby["user_ids"]
    ])  # shape : (nb_joueurs, nb_jeux)

    nb_users_total = all_interactions["user_id"].nunique()
    if nb_users_total < 5 or all_interactions.empty:
        collab_scores_per_user = np.zeros_like(content_scores_per_user)
        alpha = 0.0
    else:
        all_user_ids = all_interactions["user_id"].unique().tolist()
        all_game_ids = games_df["game_id"].tolist()
        user_to_idx = {uid: i for i, uid in enumerate(all_user_ids)}
        game_to_idx = {gid: i for i, gid in enumerate(all_game_ids)}
        valid = all_interactions[all_interactions["game_id"].isin(game_to_idx)].copy()
        rows_idx = valid["user_id"].map(user_to_idx).values
        cols_idx = valid["game_id"].map(game_to_idx).values
        data     = valid["interaction"].values.astype(np.float32)
        user_item_matrix = csr_matrix(
            (data, (rows_idx, cols_idx)),
            shape=(len(all_user_ids), len(all_game_ids))
        )
        item_user_matrix = user_item_matrix.T.tocsr()

        als_model = AlternatingLeastSquares(
            factors=50,
            regularization=0.01,
            iterations=20,
            use_gpu=False,
        )
        als_model.fit(item_user_matrix)
        collab_scores_per_user = np.zeros((len(lobby["user_ids"]), len(all_game_ids)))
        for i, uid in enumerate(lobby["user_ids"]):
            if uid not in user_to_idx:
                continue
            user_idx = user_to_idx[uid]
            user_row = user_item_matrix[user_idx]
            item_ids, scores = als_model.recommend(
                user_idx,
                user_row,
                N=len(all_game_ids),
                filter_already_liked_items=False,
            )
            for item_id, score in zip(item_ids, scores):
                collab_scores_per_user[i][item_id] = float(score)
        alpha = ALPHA

    als_available = alpha > 0.0

    hybrid_scores_per_user = np.zeros_like(content_scores_per_user)
    for i, uid in enumerate(lobby["user_ids"]):
        nb_games = len(
            lobby_interactions[
                (lobby_interactions["user_id"] == uid) &
                (lobby_interactions["game_id"].isin(game_id_to_idx))
            ]
        )
        alpha_i = compute_alpha_for_user(nb_games, als_available)
        hybrid_scores_per_user[i] = (
            alpha_i       * normalize(collab_scores_per_user[i]) +
            (1 - alpha_i) * normalize(content_scores_per_user[i])
        )  # shape : (nb_joueurs, nb_jeux)

    tag_boost = np.ones(len(games_df))
    if lobby["all_selected_tags"]:
        tag_counts = Counter(
            tag
            for tags in lobby["selected_tags_by_user"].values()
            for tag in tags
        )
        weighted_tags_str = " ".join(
            tag
            for tag, count in tag_counts.items()
            for _ in range(count)
        )
        selected_vector = tfidf.transform([weighted_tags_str])
        tag_similarity = cosine_similarity(selected_vector, tag_matrix).flatten()
        tag_boost = 1.0 + tag_similarity

    group_score = np.mean(hybrid_scores_per_user, axis=0)
    if group_score.max() == 0:
        final_scores = tag_boost
    else:
        final_scores = group_score * tag_boost
    owned_by_group = set(lobby_interactions["game_id"].tolist())
    ranked_indices = np.argsort(final_scores)[::-1]
    recommendations = []
    for idx in ranked_indices:
        game_id = games_df.iloc[idx]["game_id"]
        if game_id in owned_by_group:
            continue
        recommendations.append({
            "game_id": game_id,
            "name":    games_df.iloc[idx]["name"],
            "slug":    games_df.iloc[idx]["slug"],
            "score":   round(float(final_scores[idx]), 4),
            "coverUrl": games_df.iloc[idx].get("coverUrl"),
        })
        if len(recommendations) >= nb_recommendations:
            break

    alphas_debug = {
        uid: round(compute_alpha_for_user(
            len(lobby_interactions[
                (lobby_interactions["user_id"] == uid) &
                (lobby_interactions["game_id"].isin(game_id_to_idx))
            ]),
            als_available
        ), 3)
        for uid in lobby["user_ids"]
    }

    return {
        "lobby_id":        lobby_id,
        "nb_players":      len(lobby["user_ids"]),
        "selected_tags":   lobby["all_selected_tags"],
        "alpha_per_user":  alphas_debug,
        "recommendations": recommendations,
    }
