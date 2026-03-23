import { Injectable, Logger } from "@nestjs/common";

type LogMetaValue = string | number | boolean | undefined;
type LogMeta = Record<string, LogMetaValue>;

@Injectable()
export class AuditLoggerService {
	private readonly logger = new Logger("Audit");

	private format(meta: LogMeta): string {
	const parts = Object.entries(meta)
	.filter((entry) => entry[1] !== undefined)
	.map((entry) => `${entry[0]}=${String(entry[1])}`);

	if (parts.length === 0)
	return "";

	return " " + parts.join(" ");
	}

	log(event: string, meta: LogMeta = {}): void {
	this.logger.log(`${event}${this.format(meta)}`);
	}

	warn(event: string, meta: LogMeta = {}): void {
	this.logger.warn(`${event}${this.format(meta)}`);
	}

	error(event: string, meta: LogMeta = {}): void {
	this.logger.error(`${event}${this.format(meta)}`);
	}

	// Helpers “métier” 
	authLoginAttempt(email: string): void {
	this.log("auth.login.attempt", { email });
	}

	authLoginSuccess(userId: string, email: string): void {
	this.log("auth.login.success", { userId, email });
	}

	authLoginFail(email: string): void {
	this.warn("auth.login.fail", { email });
	}

	lobbyCreated(lobbyId: string, ownerId: string): void {
	this.log("lobby.create", { lobbyId, ownerId });
	}

	lobbyJoin(lobbyId: string, userId: string): void {
	this.log("lobby.join", { lobbyId, userId });
	}
	}