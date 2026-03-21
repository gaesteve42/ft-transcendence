.PHONY: all up restart logs down clean reset-db fclean prune re re-nocache backup

all: up

up:
	@echo "Starting services..."
	@docker compose -f docker-compose.yml up -d --build


restart:
	@echo "Restarting services without deleting volumes (DB persists)..."
	@docker compose down
	@docker compose -f docker-compose.yml up -d --build

logs:
	@docker compose logs -f

down:
	@echo "Stopping services..."
	@docker compose down

clean: down

reset-db:
	@echo "Stopping services and deleting database volume..."
	@docker compose down -v
	@echo "Rebuilding and restarting services..."
	@docker compose up -d --build

fclean:
	@echo "Stopping services..."
	@docker compose down -v
	@echo "Removing Docker images..."
	@docker compose down --rmi all 2>/dev/null || true
	@echo "Cleanup complete."

prune: fclean
	@echo "Removing ALL Docker cache..."
	@docker builder prune --all --force
	@docker system prune --all --volumes --force
	@echo "Complete purge done."

re: fclean all

re-nocache: prune
	@docker compose up -d --build --no-cache

backup:
	@bash scripts/backup.sh
