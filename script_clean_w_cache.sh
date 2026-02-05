#!/bin/bash

echo "Nettoyage complet Docker en cours..."
echo ""

# Arrêter tous les conteneurs
echo "[1] Arrêt de tous les conteneurs..."
docker stop $(docker ps -qa) 2>/dev/null || echo "    OK - Aucun conteneur actif"

# Supprimer tous les conteneurs
echo "[2] Suppression de tous les conteneurs..."
docker rm $(docker ps -qa) 2>/dev/null || echo "    OK - Aucun conteneur à supprimer"

# Supprimer toutes les images
echo "[3] Suppression de toutes les images..."
docker rmi -f $(docker images -qa) 2>/dev/null || echo "    OK - Aucune image à supprimer"

# Supprimer tous les volumes
echo "[4] Suppression de tous les volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || echo "    OK - Aucun volume à supprimer"

# Supprimer les réseaux personnalisés
echo "[5] Suppression des réseaux personnalisés..."
docker network prune -f 2>/dev/null || echo "    OK - Aucun réseau à supprimer"

# Nettoyage du cache builder
echo "[6] Nettoyage du cache Docker..."
docker builder prune -af 2>/dev/null || echo "    OK - Cache déjà propre"

echo ""
echo "Nettoyage terminé!"
echo ""
echo "État du système Docker:"
echo "Conteneurs actifs: $(docker ps -q | wc -l)"
echo "Images: $(docker images -q | wc -l)"
echo "Volumes: $(docker volume ls -q | wc -l)"
echo "Réseaux: $(docker network ls -q | wc -l)"