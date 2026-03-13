# main.py - placeholder
import numpy as np
import pandas as pd
import sklearn
import matplotlib.pyplot as plt
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MultiLabelBinarizer
from scipy.sparse import hstack
from fastapi import FastAPI

app = FastAPI()
@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/recommend")
def recommend(lobby_id, nb_recommendations): # A check les arguments
    
    # Traitement des donnees

    ## Table users
    users = pd.DataFrame({
    "user_id": [1,2,3,4]
    })
    


    ## Table games (catalogue)
    games = pd.DataFrame({
    "game_id": [101,102,103],
    "title": ["Elden Ring","Stardew Valley","Hades"],
    "genres": [
        "Action,RPG",
        "Simulation,Farming",
        "Action,Roguelike"
    ],
    "tags": [
        "Souls-like,Open World",
        "Relaxing,Pixel Art",
        "Fast-paced,Indie"
    ]})
    ## Nettoyage des donnees (A remanier, voir si en local, ici ou en amont dans la db)
    ## Nettoyer jeux sans id, jeux sans tags, doublons
    games = games.drop_duplicates("game_id")
    games = games.dropna()



    ## Table user owned games (bibliotheques)
    libraries = pd.DataFrame({
    "user_id":[1,1,2,3,4],
    "game_id":[101,102,101,103,102]})



    ## Table likes user-games (implicit feedback)
    likes = pd.DataFrame({
    "user_id":[1,2,3],
    "game_id":[103,102,101],
    "liked":[1,1,1]})


    ## Table d'interactions
    ## On concatene les bibliotheques et les likes, on assigne 1
    ## /!\/!\/!\A boucler pour tous les users pour rester dans le content-based /!\/!\/!\
    interactions = pd.concat([libraries.assign(interaction=1),
    likes.assign(interaction=1)])
    [["user_id","game_id","interaction"]]



    ## Transformation table interation -> matrice d'interactions
    ## Lignes user, colonnes games(id), centre 0 ou 1 (interactions)
    ## Fill avec 0 -> matrice sparse -> csr matrix a utiliser /!\/!\/!\(verifier le type de retour)/!\/!\/!\
    interaction_matrix = interactions.pivot_table(
    index="user_id",
    columns="game_id",
    values="interaction",
    fill_value=0)



    ## Multi-hot encoding des genres (Passage de texte a nombre)
    games["genres"] = games["genres"].str.split(",") # /!\/!\/!\ pour csv /!\/!\/!\
    mlb = MultiLabelBinarizer()
    genre_matrix = mlb.fit_transform(games["genres"])
    
    
    ## Vectorisation des tags TF-IDF
    ## TF valorise la frequence N/nb_iterations
    ## IDF penalise l'absence log(N/nb_iterations)
    ## TF-IDF -> tf * idf (matrice finale)
    tfidf = TfidfVectorizer()
    tag_matrix = tfidf.fit_transform(games["tags"])

    ## Vecteur final des jeux
    game_features = hstack([genre_matrix, tag_matrix])

    #########################################################

    # Content-based model

    ## Calcul de similarite (cosine similarity)
    similarity_matrix = cosine_similarity(game_features)

    ## Construction d'une recommendation pour UN joueur
    ## /!\/!\/!\ A boucler dans for ?? /!\/!\/!\
    owned = libraries[libraries.user_id == user_id]["game_id"]
    scores = similarity_matrix[owned].mean(axis=0)
    recommended = np.argsort(scores)[::-1][:nb_recommendations]
    games.iloc[recommended]

### Exemple fct : 
def recommend_content(user_id, nb_recommendations): #Les arguments en entree du endpoint fastapi
owned = libraries[libraries.user_id == user_id]["game_id"]
scores = similarity_matrix[owned].mean(axis=0)
recommended = np.argsort(scores)[::-1][:nb_recommendations]
return games.iloc[recommended]
### Boucler fct dans for pour tout le lobby puis etendre au groupe

    ## Extension au groupe
    ### /!\/!\/!\Construire tous les scores_user/!\/!\/!\
    score_group = moyenne(scores_user)

    #########################################################

    # Collaborative Filtering (implicit feedback, likes only)
    ## Item_similarity pour un user du lobby
    item_similarity = cosine_similarity(user_game_matrix.T)
    ### /!\/!\/!\ A boucler sur le lobby /!\/!\/!\

    ## Matrix factorisation (ALS = Alternating Least Squares)
    ## Principe user vector, game vector

    matrix = csr_matrix(user_game_matrix.values)
    model = implicit.als.AlternatingLeastSquares(
    factors=50,
    regularization=0.01,
    iterations=20)

    model.fit(matrix)

    ## Recommendation collaborative
    ### A boucler sur les user du lobby
    ### Fonction recommend_content plus haut

    recommendations = model.recommend_content(
    user_id,
    matrix[user_id],
    N=nb_recommendations)

    ## Ranking the recommendations (BPR = Bayesian Personalized Ranking)
    model = implicit.bpr.BayesianPersonalizedRanking()

    ## Recommendation pour le lobby
    ## Average strategy (moyenne des scores des joueurs)
    group_score1 = np.mean(user_scores, axis=0)

    ## Least misery (eviter les jeux detestes)
    group_score2 = np.min(user_scores, axis=0)

    ## Most pleasure (favoriser les jeux adores par un joueur)
    group_score3 = np.max(user_scores, axis=0)

    ## Weighted (on calcule le score final en ponderant chaque score)
    ### A bien comprendre
    group_score = w1*s1 + w2*s2 + w3*s3

    #########################################

    ## Hybrid
    ## Regroupement content + collaborative
    ## Tri des recommendations
    ### A bien comprendre
    final_score = α * collaborative + (1-α) * content
    topNB = np.argsort(final_scores)[::-1][:nb_recommendations]
    recommended_games = games.iloc[topNB]

    ##########################################

    return {"message": "Check logs in docker"} # A voir quoi et comment return


######################################


# Evaluation du modele

Évaluation :
##########
Precision@k

precision = liked_recommended / recommended

precision = hits / k
##########
Recall@k

recall = hits / total_liked
##########
Hit Rate

au moins un jeu aimé dans la liste
##########
MAP

Moyenne de la précision cumulée.

#########################################


# Exemple de connection sqlalchemy

from sqlalchemy import create_engine, text

# paramètres de connexion
user = "mon_user"
password = "mon_password"
host = "localhost"
port = "5432"
database = "ma_base"

# URL de connexion
DATABASE_URL = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}"

# création du moteur
engine = create_engine(DATABASE_URL)

# test de connexion
with engine.connect() as conn:
    result = conn.execute(text("SELECT version();"))
    for row in result:
        print(row)

# Format : postgresql+psycopg2://USER:PASSWORD@HOST:PORT/DATABASE

# Exemple avec ORM
from sqlalchemy.orm import sessionmaker

Session = sessionmaker(bind=engine)
session = Session()

result = session.execute(text("SELECT NOW();"))
print(result.fetchone())

session.close()