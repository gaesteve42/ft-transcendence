*This project has been created as part of the 42 curriculum by <login1>, <login2>, <login3>.*

# GameFinder

## Description

GameFinder is a multiplayer game recommendation platform. Players join lobbies, and the system suggests games that best match the group's collective tastes — games nobody in the lobby already owns, ranked by relevance to the whole group.

### Key Features

- **Hybrid recommendation engine**: Combines content-based filtering and collaborative filtering (ALS) for personalized suggestions.
- **Lobby-aware group recommendations**: Aggregates scores across all lobby members to find games that suit everyone.
- **Tag preference boost**: Lobby members can select genre tags that are used to boost matching games in the final ranking.
- **Adaptive collaborative weight (ALPHA)**: The collaborative filtering contribution scales with the user's library size.
- **Playtime-weighted interactions**: User-game interaction strength is derived from playtime using a logarithmic normalization, ensuring heavy users don't dominate.

## Team Information
 
### <login1>
- **Role(s):**
- **Responsibilities:**

### <login2>
- **Role(s):**
- **Responsibilities:**

### <login3>
- **Role(s):**
- **Responsibilities:**

## Project Management

### Work Organization

### Project Management Tools

### Communication Channels

## Technical Stack

### Frontend

### Backend

- **Python 3.12** with **FastAPI** — REST API exposing the recommendation endpoint.
- **SQLAlchemy** — ORM for database access.
- **Uvicorn** — ASGI server running the FastAPI application on port 8001.

### Recommendation Libraries

| Library | Role |
|---------|------|
| `scikit-learn` | TF-IDF vectorization and cosine similarity for content-based filtering |
| `implicit` | Alternating Least Squares (ALS) for collaborative filtering |
| `numpy` | Score matrix operations, normalization, ranking |
| `pandas` | Dataframe manipulation for games and interactions |
| `scipy` | Sparse matrix construction for the ALS user-item matrix |

### Database

- **PostgreSQL** — relational database accessed via `psycopg2-binary` and SQLAlchemy.

### Other Technologies & Libraries

- **Docker** — the recommendation service runs in an isolated container built from `python:3.12-slim`.

### Justification for Major Technical Choices

- **Hybrid filtering**: Content-based alone cannot leverage collective behavior; collaborative filtering alone fails for new users with small libraries (cold-start). The hybrid approach with adaptive ALPHA solves both problems.
- **ALS over SVD**: ALS from the `implicit` library is designed for implicit feedback (playtime rather than explicit ratings), which matches our data model.
- **TF-IDF on tags**: Game tags are repeated proportionally to their weight before vectorization, naturally encoding tag importance without modifying the TF-IDF algorithm.
- **Microservice architecture**: The recommendation engine is a separate container so it can be restarted or scaled independently without affecting the main backend.

## Database Schema

### Tables & Relationships

```
User ──────────┬── UserGame ──── Game ──── GameSourceTag ──── Tag
               │                               │
               └── LobbyMember ── Lobby ── LobbyTagPreference ── Tag
               └── LobbyTagPreference
```

| Table | Description |
|-------|-------------|
| `User` | Registered users (local or Steam OAuth) |
| `Game` | Game catalog with name, slug, cover URL |
| `GameSourceTag` | Raw tags per game from an external source, with weight |
| `Tag` | Normalized tag dictionary (slug + label) |
| `UserGame` | User library: owned games and playtime in minutes |
| `Lobby` | A session grouping several players |
| `LobbyMember` | Many-to-many join between lobbies and users |
| `LobbyTagPreference` | Genre tags selected by each user within a lobby session |

### Key Fields & Data Types

| Table | Field | Type | Notes |
|-------|-------|------|-------|
| `User` | `id` | String (PK) | |
| `User` | `steamId` | String (nullable) | Steam OAuth identifier |
| `Game` | `id` | String (PK) | |
| `Game` | `canonicalSlug` | String (unique) | URL-friendly identifier |
| `GameSourceTag` | `weight` | Float (nullable) | Tag importance score |
| `GameSourceTag` | `normalizedTagId` | FK → Tag | Mapped to canonical tag |
| `UserGame` | `playtimeMinutes` | Integer (nullable) | Source of interaction weight |
| `UserGame` | `owned` | Boolean | Only owned games are used |
| `LobbyTagPreference` | `tagId` | FK → Tag | Tag selected for this session |

## Instructions

### Prerequisites


### Installation & Configuration

1. Clone the repository.
2. Create a `.env` file at the root (or set environment variables directly).
3. The recommendation service reads `DATABASE_URL` from its environment (see `db.py`).

### Running the Project

Start all services via Makefile from the project root:

```bash
make up
```

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — returns `{"status": "ok"}` |
| `GET` | `/recommend/{lobby_id}` | Returns recommended games for the given lobby |

**Query parameters for `/recommend/{lobby_id}`:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `nb_recommendations` | `10` | Number of games to return |

**Example response:**
```json
{
  "lobby_id": "abc123",
  "nb_players": 3,
  "selected_tags": ["rpg", "co-op"],
  "alpha_per_user": {"user1": 0.4, "user2": 0.12, "user3": 0.0},
  "recommendations": [
    {"game_id": "...", "name": "Game Name", "slug": "game-name", "score": 0.8321, "coverUrl": "..."}
  ]
}
```

## Features List

| Feature | Description | Team Member(s) |
|---------|-------------|----------------|
| Recommendation API | FastAPI microservice exposing `/recommend/{lobby_id}` | <login_pierre> |
| Content-based filtering | TF-IDF on game tags + cosine similarity against user library | <login_pierre> |
| Collaborative filtering | ALS (Alternating Least Squares) on the global user-item matrix | <login_pierre> |
| Hybrid scoring | Adaptive blend of content and collaborative scores via ALPHA | <login_pierre> |
| Tag preference boost | Lobby-selected tags boost games matching those genres | <login_pierre> |
| Group scoring | Averages individual scores across all lobby members | <login_pierre> |
| Playtime normalization | Log-scale normalization of playtime into interaction weights | <login_pierre> |

## Modules

| Module | Type | Points | Team Member(s) | Justification |
|--------|------|--------|----------------|---------------|
| Recommendation system using machine learning | Major | 2 | <login_pierre> | Adds personalized, lobby-aware game recommendations using collaborative and content-based ML techniques |

**Total points:** 2 (Major = 2 pts)

### Module Details: Recommendation System (Major)

- **Personalized recommendations**: Each user's score is computed from their own library and playtime, then averaged across the group.
- **Collaborative filtering**: ALS on the full user-item matrix captures latent preferences from global usage patterns. Activates when at least 5 users have data.
- **Content-based filtering**: TF-IDF vectorizes game tags; cosine similarity finds games close to what each user already owns.
- **Continuous improvement**: As more users accumulate playtime and more interactions are recorded, the collaborative component's weight increases automatically.

## Individual Contributions

### <login_pierre>

- Designed and implemented the entire recommendation microservice (`main.py`, `data_loader.py`, `models.py`, `db.py`).
- Implemented content-based filtering using TF-IDF vectorization of game tags and cosine similarity.
- Implemented collaborative filtering using Alternating Least Squares (ALS) from the `implicit` library on an implicit feedback matrix derived from playtime.
- Designed the adaptive ALPHA blending strategy to handle the cold-start problem for users with small libraries.
- Implemented tag preference boosting to incorporate lobby members' expressed genre preferences into the final ranking.
- Implemented group scoring by averaging per-user hybrid scores, ensuring recommendations are relevant to the whole lobby.

### <login1>

### <login2>

## Resources

### Documentation & References

- [FastAPI documentation](https://fastapi.tiangolo.com/) — API framework used for the recommendation service.
- [implicit library documentation](https://benfred.github.io/implicit/) — ALS collaborative filtering for implicit feedback datasets.
- [scikit-learn: TfidfVectorizer](https://scikit-learn.org/stable/modules/generated/sklearn.feature_extraction.text.TfidfVectorizer.html) — TF-IDF vectorization for content-based filtering.
- [scikit-learn: cosine_similarity](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html) — Similarity metric between game tag vectors.
- [SQLAlchemy ORM documentation](https://docs.sqlalchemy.org/en/20/orm/) — Database access layer.
- [geeksforgeeks tutorials](https://www.geeksforgeeks.org/) - Several tutorials for machine learning and python

### AI Usage

- Claude was used to generate this README from the source code of the recommendation module.
- AI was also consulted during development to discuss the trade-offs between collaborative filtering approaches for implicit feedback data, and to validate the log-normalization formula for playtime interaction weights.
- Use for debug.
- AI was used in learning mode in order to understand some key concepts for machine learning algorithms.