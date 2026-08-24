(BigInt.prototype as any).toJSON = function (this: bigint) {
	return this >= BigInt(Number.MIN_SAFE_INTEGER) && this <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(this) : this.toString();
};

import { invoke } from "@tauri-apps/api/core";
import { store } from "/scripts/lib/store.ts";
import { links } from "/scripts/lib/link.ts";
import "/scripts/lib/tooltip.ts";

import { DiscordClient } from "/scripts/services/discord/client.ts";
import { presenceManager } from "/scripts/services/presence.ts";

import { renderApp } from "/components/app/app.ts";
import { renderLogin } from "/components/login/login.ts";

export const discordClient = new DiscordClient(new URL("https://discord.com/api/v9"));

const main = () => {
	links.init();
	presenceManager.init();

	const container = document.body;

	let currentCleanup: (() => void) | null = null;
	let currentToken: string | null = null;
	let currentRoute: "login" | "app" | null = null;

	store.subscribe((state) => {
		if (state.token && state.token !== currentToken) {
			currentToken = state.token;
			discordClient.init(state.token);
			store.setState({ route: "app" });
		} else if (!state.token && currentToken) {
			currentToken = null;
			discordClient.disconnect(false);
			store.setState({ route: "login" });
			invoke("show_settings").catch(() => {});
		}
	});

	store.subscribe((state) => {
		if (state.route !== currentRoute) {
			currentRoute = state.route;

			if (currentCleanup) {
				try {
					currentCleanup();
				} catch (error) {
					console.error("Error cleaning up previous view:", error);
				}
				currentCleanup = null;
			}

			if (state.route === "login") {
				currentCleanup = renderLogin(container);
				invoke("show_settings").catch(() => {});
			} else if (state.route === "app") {
				currentCleanup = renderApp(container);
			}
		}
	});

	const initialState = store.getState();
	if (initialState.token) discordClient.init(initialState.token);
	else invoke("show_settings").catch(() => {});
};

addEventListener("DOMContentLoaded", main);

addEventListener("beforeunload", () => {
	discordClient.isUnloading = true;
	discordClient.disconnect(false);
});

addEventListener("keydown", async (event) => {
	if (event.key === "F5" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r")) {
		event.preventDefault();

		discordClient.isUnloading = true;
		try {
			await discordClient.disconnect(false);
		} catch (_error) { }

		location.reload();
	}
});