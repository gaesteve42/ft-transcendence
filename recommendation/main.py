# main.py - placeholder
import numpy as np
import pandas as pd
import sklearn
import matplotlib.pyplot as plt
from scipy.sparse import csr_matrix
from sklearn.neighbors import NearestNeighbors
from fastapi import FastAPI

app = FastAPI()
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/recommend")
def recommend():
    games = [
        {"id": 1, "name": "Left 4 Dead 2", "tags": ["coop", "zombie", "fps", "action"]},
        {"id": 2, "name": "Overcooked 2", "tags": ["coop", "party", "cooking"]},
        {"id": 3, "name": "Portal 2", "tags": ["puzzle", "coop", "story"]},
        {"id": 4, "name": "Civilization VI", "tags": ["strategy", "turn-based"]},
        {"id": 5, "name": "Phasmophobia", "tags": ["coop", "horror"]},
    ]

    player_libraries = {
        "player1": [1, 3],
        "player2": [1, 5],
        "player3": [2]
    }

    from collections import Counter
    import math

    # Base de jeux
    games = [
        {"id": 1, "name": "Left 4 Dead 2", "tags": ["coop", "zombie", "fps", "action"]},
        {"id": 2, "name": "Overcooked 2", "tags": ["coop", "party", "cooking"]},
        {"id": 3, "name": "Portal 2", "tags": ["puzzle", "coop", "story"]},
        {"id": 4, "name": "Civilization VI", "tags": ["strategy", "turn-based"]},
        {"id": 5, "name": "Phasmophobia", "tags": ["coop", "horror"]},
    ]

    # Bibliothèque des joueurs
    player_libraries = {
        "player1": [1, 3],
        "player2": [1, 5],
        "player3": [2]
    }

    # Tags sélectionnés par le groupe
    group_tags = ["coop"]

    # -----------------------------------------
    # 1. Construire un index des jeux
    # -----------------------------------------

    game_dict = {game["id"]: game for game in games}

    # -----------------------------------------
    # 2. Construire le profil de préférence
    # -----------------------------------------

    all_tags = []

    for library in player_libraries.values():
        for game_id in library:
            all_tags.extend(game_dict[game_id]["tags"])

    # ajouter les tags choisis par les joueurs
    all_tags.extend(group_tags)

    profile = Counter(all_tags)

    print("Profil du groupe:", profile)

    # -----------------------------------------
    # 3. Calcul du score de similarité
    # -----------------------------------------

    def cosine_similarity(profile_tags, game_tags):

        score = 0

        for tag in game_tags:
            score += profile_tags.get(tag, 0)

        return score / math.sqrt(len(game_tags))

    # -----------------------------------------
    # 4. Calcul des recommandations
    # -----------------------------------------

    recommendations = []

    owned_games = set()

    for library in player_libraries.values():
        owned_games.update(library)

    for game in games:

        if game["id"] in owned_games:
            continue

        score = cosine_similarity(profile, game["tags"])

        recommendations.append((game["name"], score))

    # -----------------------------------------
    # 5. Trier les résultats
    # -----------------------------------------

    recommendations.sort(key=lambda x: x[1], reverse=True)

    print("\nRecommandations:", flush=True)

    for game, score in recommendations:
        print(game, score)

    return {"message": "Check logs ///"}