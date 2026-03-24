# MovieFinder 🎬

> Moteur de recommandation de films personnalisé — swipe, découvre, organise.

![Stack](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/FAISS-embeddings-orange?style=flat-square)
![Stack](https://img.shields.io/badge/SQLite-aiosqlite-003B57?style=flat-square&logo=sqlite)

---

## Aperçu

MovieFinder combine un moteur **contenu** (FAISS sur vecteurs de features à 20 dimensions) et un moteur **collaboratif** (similarité cosinus item-item) pour recommander des films au plus près de tes goûts. L'interface swipe permet de noter rapidement des films et d'affiner les recommandations en temps réel.

---

## Fonctionnalités

| Fonctionnalité | Description |
| --- | --- |
| 🎯 Onboarding | 9-10 films de calibration pour établir ton profil de goût |
| 💨 Swipe Feed | Glisse à droite (aimer) ou à gauche (ignorer) |
| 🤔 Pourquoi ce film ? | Explication détaillée de chaque recommandation |
| 🎛️ Filtres | Par plateforme de streaming (Netflix, Prime, Disney+…) |
| 🚫 Mode Haine | Bannis définitivement un réalisateur ou un acteur |
| 📚 Bibliothèque | Organise tes films en "À voir" / "Déjà vu" avec drag & drop |
| ⭐ Notation | Attribue une note de 1 à 10 à tes films vus |
| ❓ Tour guidé | Présentation interactive des fonctionnalités (react-joyride) |

---

## Stack technique

### Backend

- **FastAPI** + **Uvicorn** (API REST async)
- **SQLite** via `aiosqlite` (persistance légère)
- **FAISS** (`faiss-cpu`) — index de similarité cosinus sur vecteurs 20-dim
- **NumPy** — similarité item-item collaborative

### Frontend

- **React 18** + **Vite 5**
- **Tailwind CSS 3** (design system dark)
- **Framer Motion** (animations swipe)
- **Zustand** (état global persisté en localStorage)
- **@dnd-kit** (drag & drop)
- **react-joyride** (tour interactif des fonctionnalités)
- **Lucide React** (icônes)

---

## Structure du projet

```text
MovieFinder/
├── backend/
│   ├── main.py               # Point d'entrée FastAPI
│   ├── database.py           # Setup SQLite + tables
│   ├── seed_data.py          # 55 films de seed avec vecteurs features
│   ├── models.py             # Modèles Pydantic
│   ├── requirements.txt
│   ├── routers/
│   │   ├── users.py
│   │   ├── movies.py
│   │   ├── interactions.py
│   │   ├── recommendations.py
│   │   └── library.py
│   └── recommender/
│       ├── engine.py         # Orchestrateur hybride
│       ├── content_based.py  # Index FAISS + mise à jour taste vector
│       ├── collaborative.py  # Similarité cosinus item-item
│       └── explainer.py      # Logique "Pourquoi ce film ?"
└── frontend/
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── Onboarding.jsx    # Flow de calibration
        │   ├── Feed.jsx          # Feed principal (3 panneaux)
        │   └── Library.jsx       # Page bibliothèque dédiée
        ├── components/
        │   ├── MovieCard.jsx
        │   ├── SwipeButtons.jsx
        │   ├── WhyThisModal.jsx
        │   ├── FilterPanel.jsx
        │   ├── AppTour.jsx       # Tour interactif react-joyride
        │   └── library/
        │       ├── LibraryMovieCard.jsx
        │       ├── AddMovieModal.jsx
        │       └── StarRating.jsx
        ├── store/useStore.js     # Zustand store (persisté)
        └── api/client.js         # Appels API Axios
```

---

## Installation

### Prérequis

- Python 3.10+
- Node.js 18+

### Démarrer le backend

```bash
cd MovieFinder/backend
pip install -r requirements.txt
uvicorn main:app --reload 
```

### Démarrer le frontend

```bash
cd MovieFinder/frontend
npm install
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | <http://localhost:5173> |
| Backend API | <http://localhost:8000> |
| Swagger UI | <http://localhost:8000/docs> |

---

## Architecture recommandation

### Fonctionnement

1. **Onboarding** — L'utilisateur swipe sur ~10 films de calibration (like / skip)
2. **Taste vector** — Chaque interaction met à jour un vecteur de goût de 20 dimensions
3. **Recommandations hybrides** :
   - 70 % content-based via FAISS (similarité avec le taste vector)
   - 30 % collaboratif item-item (cosine similarity sur l'historique)
   - 5 % exploration aléatoire (sérendipité)
4. **Filtres** — Plateforme de streaming, réalisateurs/acteurs bannis
5. **Explications** — "Pourquoi ce film ?" disponible sur chaque recommandation

### Vecteur de features (dim = 20)

| Dimensions | Description |
| --- | --- |
| 0–9 | Genres one-hot (Action, Drama, Thriller, Horror, Comedy, SciFi, Romance, Crime, Animation, Doc) |
| 10–12 | Décennie (avant 2000, 2000s, 2010s+) |
| 13 | Note normalisée (0–1) |
| 14–19 | Thèmes (dark, slow-burn, plot-twist, ensemble, biopic, étranger) |

---

## API — Endpoints principaux

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/users` | Créer un utilisateur anonyme |
| `GET` | `/movies/onboarding` | 9-10 films de calibration |
| `GET` | `/movies/search?q=` | Recherche par titre/réalisateur |
| `POST` | `/interactions` | Enregistrer un like ou dislike |
| `GET` | `/recommendations/{user_id}` | Recommandations personnalisées |
| `GET` | `/recommendations/{user_id}/why/{movie_id}` | Explication d'une recommandation |
| `PATCH` | `/users/{user_id}/hate` | Bannir un réalisateur ou acteur |
| `GET` | `/library/{user_id}` | Bibliothèque (aimés, à voir, vus) |
| `POST` | `/library/{user_id}/entries` | Ajouter un film à la liste |
| `PATCH` | `/library/{user_id}/entries/{id}` | Modifier une entrée |
| `DELETE` | `/library/{user_id}/entries/{id}` | Supprimer une entrée |

---

## Base de données

Fichier SQLite auto-créé à `backend/moviefinder.db` au premier lancement.

| Table | Contenu |
| --- | --- |
| `users` | id, session_token, taste_vector, banned_directors/actors |
| `movies` | Métadonnées + feature_vector |
| `interactions` | user_id, movie_id, action (like/dislike), timestamp |
| `user_movie_lists` | id, user_id, movie_id, list_type, rating, position |

---

## Roadmap

- [ ] Intégration TMDB API (posters HD, données enrichies)
- [ ] Application mobile React Native
- [ ] Authentification utilisateur (comptes persistants)
- [ ] Enrichissement du catalogue (> 55 films)
- [ ] Export de liste (Letterboxd, CSV)
