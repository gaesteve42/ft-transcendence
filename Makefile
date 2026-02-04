.PHONY: all up logs down clean fclean re

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

re: fclean all