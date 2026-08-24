import WebSocket, { Message as WebSocketMessage } from "@tauri-apps/plugin-websocket";

import { Client, RestClient } from "/scripts/lib/client.ts";
import { store, type Session, type PresenceStatus } from "/scripts/lib/store.ts";
import { join, wait } from "/scripts/lib/utils.ts";

import { Snowflake } from "/scripts/services/discord/snowflake.ts";
import { User, UserCollection } from "/scripts/services/discord/user.ts";

import {
	GatewayMessage,
	GatewayOpCode,
	GatewayEvent,
	GatewayDispatchEvent,
	GatewayCloseCode,
	GatewayIntents
} from "/scripts/services/discord/gateway.ts";

const fake = {
	os: "Mac OS X",
	browser: "Chrome",
	device: "",
	browser_user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	browser_version: "120.0.0.0",
	os_version: "10.15.7"
} as const;

export interface PresencePayload {
	status: PresenceStatus;
	since?: number | null;
	activities: any[];
	afk?: boolean;
};

export class DiscordClient extends Client {
	rest: RestClient;
	ws?: WebSocket;
	users = new UserCollection();

	private heartbeat?: ReturnType<typeof setInterval>;
	private heartbeatTimestamp?: number;
	ping?: number;

	token?: string;
	sessionId?: string;
	private resumeGatewayURL?: string;
	private sequence?: number;
	isUnloading = false;
	private isReconnecting = false;
	private reconnectAttempts = 0;
	private helloWatchdog?: ReturnType<typeof setTimeout>;
	private unlistenGateway?: (() => void);
	private connectionGeneration = 0;

	id?: Snowflake;
	private helloTimeout = 4000;
	private lastPresencePayload?: PresencePayload;

	constructor(restBaseURL: URL) {
		super();
		this.rest = new RestClient(restBaseURL);

		this.sessionId = sessionStorage.getItem("discord_session_id") ?? undefined;
		this.resumeGatewayURL = sessionStorage.getItem("discord_resume_gateway_url") ?? undefined;
		const sequence = sessionStorage.getItem("discord_sequence");
		if (sequence) this.sequence = parseInt(sequence, 10);
	};

	async init(token?: string) {
		store.setState({ connectionState: "connecting" });
		this.dispatchEvent(new CustomEvent(GatewayEvent.Connecting));

		if (token) {
			this.token = token;
			this.rest.init(token);
		}

		await this.disconnect(false);
		const generation = ++this.connectionGeneration;

		try {
			try {
				const userResponse = await this.rest.request("/users/@me");
				if (generation !== this.connectionGeneration) return;

				const userData = await userResponse.json();
				if (generation !== this.connectionGeneration) return;

				store.setState({ currentUser: userData });
			} catch (error: any) {
				console.error("Token verification failed:", error);
				if (generation !== this.connectionGeneration) return;
				if (error.message && (error.message.includes("401") || error.message.includes("403"))) {
					this.resetAndRedirectToLogin();
					return;
				}
			}

			let gatewayURL = this.resumeGatewayURL;
			if (!gatewayURL) {
				const gatewayResponse = await this.rest.request("/gateway");
				if (generation !== this.connectionGeneration) return;

				const gatewayData = await gatewayResponse.json();
				if (generation !== this.connectionGeneration) return;

				gatewayURL = gatewayData.url;
			}

			try {
				const ws = await WebSocket.connect(join(gatewayURL!, "?v=9&encoding=json"), {
					headers: {
						"Origin": "https://discord.com",
						"User-Agent": fake.browser_user_agent
					}
				});

				if (generation !== this.connectionGeneration) {
					ws.disconnect().catch((error) => console.error("Failed to disconnect WebSocket:", error));
					return;
				}

				this.ws = ws;

				const listenerGeneration = generation;
				this.unlistenGateway = this.ws.addListener((message) => {
					if (listenerGeneration !== this.connectionGeneration) return;
					this.gateway(message);
				});

				this.startHelloWatchdog();
			} catch (error) {
				console.error("Failed to initialize Discord client:", error);
			}
		} catch (error: any) {
			console.error("Failed to get Discord Gateway URL:", error);
			if (generation !== this.connectionGeneration) return;
			if (error.message && (error.message.includes("401") || error.message.includes("403"))) this.resetAndRedirectToLogin();
		}
	};

	self<Cached extends boolean = false>(force?: boolean, cached?: Cached): Cached extends true ? User | undefined : Promise<User> {
		const self = this.users.cached().get("@me");
		if (cached) return self as any;

		return this.users.get("@me", force, cached as any).then((self) => {
			this.id = self!.id;
			return self!;
		}) as any;
	};

	private async resetAndRedirectToLogin() {
		this.token = undefined;
		this.sessionId = undefined;
		this.sequence = undefined;
		this.resumeGatewayURL = undefined;

		sessionStorage.removeItem("discord_session_id");
		sessionStorage.removeItem("discord_sequence");
		sessionStorage.removeItem("discord_resume_gateway_url");

		store.setState({
			token: null,
			currentUser: null,
			connectionState: "disconnected",
			route: "login"
		});

		await this.disconnect(false).catch((error) => console.error("Failed to disconnect WebSocket:", error));
	};

	private async reconnect() {
		if (this.isUnloading) return;
		if (this.isReconnecting) return;
		this.isReconnecting = true;

		if (this.reconnectAttempts > 0) {
			const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
			await wait(delay);
		}
		this.reconnectAttempts++;

		store.setState({ connectionState: "connecting" });
		this.dispatchEvent(new CustomEvent(GatewayEvent.Connecting));

		const generation = ++this.connectionGeneration;

		try {
			const gatewayURL = this.resumeGatewayURL ?? (await (await this.rest.request("/gateway")).json()).url;
			if (generation !== this.connectionGeneration) { this.isReconnecting = false; return; }

			const ws = await WebSocket.connect(join(gatewayURL, "?v=9&encoding=json"), {
				headers: {
					"Origin": "https://discord.com",
					"User-Agent": fake.browser_user_agent
				}
			});

			if (generation !== this.connectionGeneration) {
				await ws.disconnect().catch((error) => console.error("Failed to disconnect WebSocket:", error));
				this.isReconnecting = false;
				return;
			}

			this.ws = ws;

			const listenerGeneration = generation;
			this.unlistenGateway = this.ws.addListener((message) => {
				if (listenerGeneration !== this.connectionGeneration) return;
				this.gateway(message);
			});

			this.isReconnecting = false;
			this.startHelloWatchdog();
		} catch (error: any) {
			console.error("Failed to reconnect:", error);
			this.isReconnecting = false;
			if (generation !== this.connectionGeneration) return;

			if (error.message && (error.message.includes("401") || error.message.includes("403"))) {
				this.resetAndRedirectToLogin();
				return;
			}

			store.setState({ connectionState: "disconnected" });
			this.dispatchEvent(new CustomEvent(GatewayEvent.Disconnected, { detail: error }));
			if (!this.isUnloading) this.reconnect();
		}
	};

	async disconnect(reconnect = true) {
		this.connectionGeneration++;
		this.isReconnecting = false;

		store.setState({ connectionState: "disconnected" });
		this.dispatchEvent(new CustomEvent(GatewayEvent.Disconnected));

		if (this.heartbeat) clearInterval(this.heartbeat);
		this.heartbeat = undefined;
		this.heartbeatTimestamp = undefined;
		if (this.helloWatchdog) clearTimeout(this.helloWatchdog);
		this.helloWatchdog = undefined;

		if (this.unlistenGateway) {
			this.unlistenGateway();
			this.unlistenGateway = undefined;
		}

		if (this.ws) {
			const wsToDisconnect = this.ws;
			this.ws = undefined;

			try {
				await Promise.race([
					wsToDisconnect.disconnect(),
					wait(this.isUnloading ? 1500 : 500)
				]);
			} catch (error) {
				console.error("Failed to disconnect WebSocket:", error);
			}
		}

		if (reconnect) this.reconnect();
	};

	private startHelloWatchdog() {
		if (this.helloWatchdog) clearTimeout(this.helloWatchdog);
		this.helloWatchdog = setTimeout(() => {
			console.warn("Did not receive Hello in time. Retrying...");
			this.resumeGatewayURL = undefined;
			sessionStorage.removeItem("discord_resume_gateway_url");
			this.disconnect(true);
		}, this.helloTimeout);
	};

	private parseGatewayMessage(rawMessage: WebSocketMessage): GatewayMessage | null {
		try {
			if (rawMessage.type !== "Text") return null;

			const message = JSON.parse(rawMessage.data as string);

			return {
				code: message.op,
				data: message.d,
				sequence: message.s ?? null,
				event: message.t ?? null
			};
		} catch (error) {
			console.error("Failed to parse gateway message:", error);
			return null;
		}
	};

	async gateway(rawMessage: WebSocketMessage) {
		if (rawMessage.type === "Close") {
			console.error("WebSocket connection closed:", rawMessage.data);
			const closeFrame = rawMessage.data;
			if (closeFrame && (closeFrame.code === GatewayCloseCode.AuthenticationFailed || closeFrame.code === GatewayCloseCode.DisallowedIntents)) {
				console.error(`Authentication failed (Close code: ${closeFrame.code}). Redirecting to login.`);
				this.resetAndRedirectToLogin();
				return;
			}

			this.ws = undefined;
			await this.disconnect(true).catch((error) => console.error("Failed to disconnect WebSocket:", error));
			return;
		}

		const message = this.parseGatewayMessage(rawMessage);
		if (!message) return;

		switch (message.code) {
			case GatewayOpCode.Dispatch:
				this.sequence = message.sequence;
				if (this.sequence) sessionStorage.setItem("discord_sequence", this.sequence.toString());

				switch (message.event) {
					case GatewayDispatchEvent.Ready:
						this.reconnectAttempts = 0;
						this.sessionId = message.data.session_id;
						this.resumeGatewayURL = message.data.resume_gateway_url;

						sessionStorage.setItem("discord_session_id", this.sessionId!);
						sessionStorage.setItem("discord_resume_gateway_url", this.resumeGatewayURL!);

						const self = new User(message.data.user);
						this.users.set("@me", self);
						this.users.set(self.id, self);
						this.id = self.id;

						store.setState({
							currentUser: message.data.user,
							connectionState: "connected"
						});

						if (this.lastPresencePayload) this.sendPresence(this.lastPresencePayload);
						break;

					case GatewayDispatchEvent.Resumed:
						this.reconnectAttempts = 0;
						store.setState({ connectionState: "connected" });
						if (this.lastPresencePayload) this.sendPresence(this.lastPresencePayload);
						break;

					case GatewayDispatchEvent.SessionsReplace:
						const sessions: Session[] = message.data;
						const currentSession = sessions.find((session) => session.session_id === this.sessionId) ?? sessions.find((session) => session.active);

						store.setState({
							sessions,
							currentPresence: currentSession?.status ?? null
						});
						break;
				}

				if (message.event) this.dispatchEvent(new CustomEvent(message.event, { detail: message.data }));
				break;

			case GatewayOpCode.Reconnect:
				await this.disconnect().catch((error) => console.error("Failed to disconnect WebSocket:", error));
				break;

			case GatewayOpCode.InvalidSession:
				const canResume = message.data === true;
				if (!canResume) {
					this.sessionId = undefined;
					this.sequence = undefined;
					this.resumeGatewayURL = undefined;
					sessionStorage.removeItem("discord_session_id");
					sessionStorage.removeItem("discord_sequence");
					sessionStorage.removeItem("discord_resume_gateway_url");
					await wait(1000 + Math.random() * 1500);
				}

				await this.disconnect(true).catch((error) => console.error("Failed to disconnect WebSocket:", error));
				break;

			case GatewayOpCode.Hello:
				if (this.helloWatchdog) {
					clearTimeout(this.helloWatchdog);
					this.helloWatchdog = undefined;
				}

				this.sendHeartbeat();
				this.heartbeat = setInterval(() => this.sendHeartbeat(), message.data.heartbeat_interval);

				if (this.sessionId && this.sequence != null && this.resumeGatewayURL && this.token) this.sendResume();
				else if (this.token) this.sendIdentify();
				break;

			case GatewayOpCode.HeartbeatACK:
				if (this.heartbeatTimestamp) {
					this.ping = Math.round(performance.now() - this.heartbeatTimestamp);
					store.setState({ ping: this.ping, connectionState: "connected" });
				}
				this.heartbeatTimestamp = undefined;
				this.dispatchEvent(new CustomEvent(GatewayEvent.Heartbeat, { detail: this.ping }));
				break;
		}
	};

	async send(data: any) {
		if (!this.ws) return null;

		try {
			return await this.ws.send(JSON.stringify(data));
		} catch (error) {
			console.error("Failed to send data over WebSocket:", error);
			return null;
		}
	};

	async sendPresence(presence: PresencePayload) {
		this.lastPresencePayload = presence;
		if (!this.ws) return null;

		return this.send({
			op: GatewayOpCode.PresenceUpdate,
			d: {
				status: presence.status,
				since: presence.since ?? 0,
				activities: presence.activities ?? [],
				afk: presence.afk ?? false
			}
		});
	};

	private async sendHeartbeat() {
		if (this.heartbeatTimestamp) {
			console.warn("Heartbeat timeout. Reconnecting...");
			await this.disconnect().catch((error) => console.error("Failed to disconnect WebSocket:", error));
			return;
		}

		this.heartbeatTimestamp = performance.now();
		this.send({
			op: GatewayOpCode.Heartbeat,
			d: this.sequence ?? null
		});
	};

	private async sendIdentify() {
		const identifyGeneration = this.connectionGeneration;
		const lastIdentify = sessionStorage.getItem("discord_last_identify");
		if (lastIdentify && (Date.now() - parseInt(lastIdentify, 10)) < 5000) await wait(5000 - (Date.now() - parseInt(lastIdentify, 10)));
		if (identifyGeneration !== this.connectionGeneration) return;

		sessionStorage.setItem("discord_last_identify", Date.now().toString());
		this.send({
			op: GatewayOpCode.Identify,
			d: {
				token: this.token,
				properties: {
					os: fake.os,
					browser: fake.browser,
					device: fake.device,
					browser_user_agent: navigator.userAgent,
					browser_version: fake.browser_version,
					os_version: fake.os_version,
					referrer: "",
					referring_domain: "",
					referrer_current: "",
					referring_domain_current: "",
					release_channel: "stable"
				},
				compress: false,
				intents: GatewayIntents.UserSettingsProto
			}
		});
	};

	private async sendResume() {
		this.send({
			op: GatewayOpCode.Resume,
			d: {
				token: this.token,
				session_id: this.sessionId,
				seq: this.sequence ?? null
			}
		});
	};
};