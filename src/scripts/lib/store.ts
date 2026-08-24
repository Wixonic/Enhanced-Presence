export type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";
export type PresenceMode = "online" | "idle" | "dnd" | "invisible" | "dynamic";

export interface AppleMusicTrack {
	running: boolean;
	player_state: string;
	name?: string;
	artist?: string;
	album?: string;
	position?: number;
	duration?: number;
	artworkUrl?: string;
	songUrl?: string;
};

export interface Session {
	session_id: string;
	status: PresenceStatus;
	activities: any[];
	client_info: {
		os: string;
		client: string;
		version: number;
	};
	active: boolean;
};

export interface AppState {
	route: "login" | "app";
	token: string | null;
	currentUser: any | null;
	sessions: Session[];
	currentPresence: PresenceStatus | null;
	connectionState: "connecting" | "connected" | "disconnected";
	ping: number | null;
	presenceMode: PresenceMode;
	appleMusicEnabled: boolean;
	customStatusEnabled: boolean;
	customStatusText: string;
	customStatusEmoji: string;
	currentTrack: AppleMusicTrack | null;
};

type StateListener = (state: AppState) => void;

class Store {
	private state: AppState = {
		route: localStorage.getItem("discord_token") ? "app" : "login",
		token: localStorage.getItem("discord_token"),
		currentUser: null,
		sessions: [],
		currentPresence: null,
		connectionState: "disconnected",
		ping: null,
		presenceMode: (localStorage.getItem("presence_mode") as PresenceMode) || "dynamic",
		appleMusicEnabled: localStorage.getItem("apple_music_enabled") !== "false",
		customStatusEnabled: localStorage.getItem("custom_status_enabled") === "true",
		customStatusText: localStorage.getItem("custom_status_text") || "",
		customStatusEmoji: localStorage.getItem("custom_status_emoji") || "",
		currentTrack: null
	};

	private listeners: Set<StateListener> = new Set();

	getState(): AppState {
		return { ...this.state };
	};

	private isNotifying = false;
	private stateChanged = false;

	setState(update: Partial<AppState>) {
		this.state = { ...this.state, ...update };
		if (update.token !== undefined) {
			if (update.token) localStorage.setItem("discord_token", update.token);
			else localStorage.removeItem("discord_token");
		}
		if (update.presenceMode !== undefined) localStorage.setItem("presence_mode", update.presenceMode);
		if (update.appleMusicEnabled !== undefined) localStorage.setItem("apple_music_enabled", String(update.appleMusicEnabled));
		if (update.customStatusEnabled !== undefined) localStorage.setItem("custom_status_enabled", String(update.customStatusEnabled));
		if (update.customStatusText !== undefined) localStorage.setItem("custom_status_text", update.customStatusText);
		if (update.customStatusEmoji !== undefined) localStorage.setItem("custom_status_emoji", update.customStatusEmoji);

		this.stateChanged = true;
		this.notify();
	};

	subscribe(listener: StateListener): () => void {
		this.listeners.add(listener);
		listener(this.getState());
		return () => this.listeners.delete(listener);
	};

	private notify() {
		if (this.isNotifying) return;

		this.isNotifying = true;

		try {
			while (this.stateChanged) {
				this.stateChanged = false;

				const state = this.getState();
				const listenersCopy = Array.from(this.listeners);
				for (const listener of listenersCopy) {
					listener(state);
					if (this.stateChanged) break;
				}
			}
		} finally {
			this.isNotifying = false;
		}
	};
};

export const store = new Store();