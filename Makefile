.PHONY: all up logs down clean fclean prune re re-nocache

all: up

up:
	@echo "Starting services..."
	@docker compose up -d --build

logs:
	@docker compose logs -f

down:
	@echo "Stopping services..."
	@docker compose down

clean: down

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