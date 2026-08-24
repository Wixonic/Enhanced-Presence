import html from "./app.html";

import { invoke } from "@tauri-apps/api/core";
import { store, type PresenceMode } from "/scripts/lib/store.ts";
import { createAvatar } from "/components/app/lib/avatar.ts";
import { createDisplayName } from "/components/app/lib/nameStyle.ts";
import { getPrimaryArtist } from "/scripts/services/presence.ts";
import { discordClient } from "/main.ts";

const formatTime = (seconds: number): string => {
	if (!seconds || isNaN(seconds) || seconds < 0) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const renderApp = (container: HTMLElement): (() => void) => {
	document.body.setAttribute("state", "app");
	container.innerHTML = html;

	const displayNameElement = container.querySelector(".display-name") as HTMLElement;
	const usernameTagElement = container.querySelector(".username-tag") as HTMLElement;
	const avatarWrapper = container.querySelector(".avatar-wrapper") as HTMLElement;
	const connectionBadge = container.querySelector(".connection-badge") as HTMLElement;
	const statusText = connectionBadge.querySelector(".status-text") as HTMLElement;

	const appleMusicToggle = container.querySelector("#apple-music-toggle") as HTMLInputElement;
	const musicCard = container.querySelector("#music-card") as HTMLElement;
	const trackTitle = musicCard.querySelector(".track-title") as HTMLElement;
	const trackArtist = musicCard.querySelector(".track-artist") as HTMLElement;
	const musicArtImg = musicCard.querySelector("#music-art-img") as HTMLImageElement;
	const musicArtFallback = musicCard.querySelector("#music-art-fallback") as HTMLElement;
	const musicProgressContainer = musicCard.querySelector("#music-progress-container") as HTMLElement;
	const musicProgressBar = musicCard.querySelector("#music-progress-bar") as HTMLElement;
	const musicTimeCurrent = musicCard.querySelector("#music-time-current") as HTMLElement;
	const musicTimeTotal = musicCard.querySelector("#music-time-total") as HTMLElement;

	const customStatusToggle = container.querySelector("#custom-status-toggle") as HTMLInputElement;
	const customStatusEmoji = container.querySelector("#custom-status-emoji") as HTMLInputElement;
	const customStatusText = container.querySelector("#custom-status-text") as HTMLInputElement;

	const logoutBtn = container.querySelector("#logout-btn") as HTMLButtonElement;
	const hideBtn = container.querySelector("#hide-btn") as HTMLButtonElement;
	const quitBtn = container.querySelector("#quit-btn") as HTMLButtonElement;

	let avatarElement: ReturnType<typeof createAvatar> | null = null;

	const updateProfile = async () => {
		try {
			const self = await discordClient.self();
			if (!self) return;

			displayNameElement.replaceChildren(createDisplayName(self.display_name, self.display_name_styles, "full"));
			usernameTagElement.textContent = self.discriminator && self.discriminator !== "0" ? `@${self.username}#${self.discriminator}` : `@${self.username}`;

			const state = store.getState();
			let avatarStatus = state.currentPresence ?? (state.presenceMode === "dynamic" ? "idle" : state.presenceMode);
			if (avatarStatus === "invisible") avatarStatus = "offline";

			const avatar = createAvatar({
				user: self,
				size: 96,
				status: avatarStatus as any,
				withStatusCutout: true
			});

			avatarWrapper.replaceChildren(avatar);
			avatarElement = avatar;
		} catch (error) {
			console.error("Failed to load user profile:", error);
		}
	};

	const unsubscribe = store.subscribe((state) => {
		connectionBadge.className = `connection-badge ${state.connectionState}`;
		if (state.connectionState === "connected") statusText.textContent = state.ping ? `${state.ping} ms` : "Connected";
		else if (state.connectionState === "connecting") statusText.textContent = "Connecting...";
		else statusText.textContent = "Disconnected";

		const modeRadio = container.querySelector(`input[name="presence-mode"][value="${state.presenceMode}"]`) as HTMLInputElement;
		if (modeRadio && !modeRadio.checked) modeRadio.checked = true;

		appleMusicToggle.checked = state.appleMusicEnabled;
		const isPlaying = state.appleMusicEnabled && state.currentTrack && state.currentTrack.player_state === "playing" && !!state.currentTrack.name;

		if (!state.appleMusicEnabled) {
			musicCard.classList.remove("playing");
			trackTitle.textContent = "Disabled";
			trackArtist.textContent = "Apple Music sync is off";
			musicArtImg.classList.add("hidden");
			musicArtFallback.classList.remove("hidden");
			musicProgressContainer.style.display = "none";
		} else if (isPlaying) {
			const track = state.currentTrack!;
			const primaryArtist = getPrimaryArtist(track.artist);
			const titleDisplay = primaryArtist && !track.name?.toLowerCase().includes(primaryArtist.toLowerCase())
				? `${primaryArtist} - ${track.name}`
				: (track.name || "Unknown Track");

			musicCard.classList.add("playing");
			trackTitle.textContent = titleDisplay;
			trackArtist.textContent = primaryArtist ? (track.album ? `${primaryArtist} — ${track.album}` : primaryArtist) : "Playing";

			if (track.artworkUrl) {
				musicArtImg.src = track.artworkUrl;
				musicArtImg.classList.remove("hidden");
				musicArtFallback.classList.add("hidden");
			} else {
				musicArtImg.classList.add("hidden");
				musicArtFallback.classList.remove("hidden");
			}

			const pos = track.position ?? 0;
			const dur = track.duration ?? 0;
			musicProgressContainer.style.display = "flex";
			musicTimeCurrent.textContent = formatTime(pos);
			musicTimeTotal.textContent = formatTime(dur);
			const percent = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0;
			musicProgressBar.style.width = `${percent}%`;
		} else {
			musicCard.classList.remove("playing");
			trackTitle.textContent = "Not playing";
			trackArtist.textContent = state.currentTrack?.running ? "Music is paused" : "Apple Music is stopped";
			musicArtImg.classList.add("hidden");
			musicArtFallback.classList.remove("hidden");
			musicProgressContainer.style.display = "none";
		}

		customStatusToggle.checked = state.customStatusEnabled;
		if (document.activeElement !== customStatusEmoji) customStatusEmoji.value = state.customStatusEmoji;
		if (document.activeElement !== customStatusText) customStatusText.value = state.customStatusText;

		if (avatarElement) {
			let avatarStatus = state.currentPresence ?? (state.presenceMode === "dynamic" ? "idle" : state.presenceMode);
			if (avatarStatus === "invisible") avatarStatus = "offline";
			avatarElement.setStatus(avatarStatus as any);
		}
	});

	container.querySelectorAll('input[name="presence-mode"]').forEach((input) => {
		input.addEventListener("change", () => {
			const target = input as HTMLInputElement;
			if (target.checked) store.setState({ presenceMode: target.value as PresenceMode });
		});
	});

	appleMusicToggle.addEventListener("change", () => {
		store.setState({ appleMusicEnabled: appleMusicToggle.checked });
	});

	customStatusToggle.addEventListener("change", () => {
		store.setState({ customStatusEnabled: customStatusToggle.checked });
	});

	customStatusEmoji.addEventListener("input", () => {
		store.setState({ customStatusEmoji: customStatusEmoji.value });
	});

	customStatusText.addEventListener("input", () => {
		store.setState({ customStatusText: customStatusText.value });
	});

	logoutBtn.addEventListener("click", async () => {
		await discordClient.disconnect(false);
		store.setState({
			token: null,
			currentUser: null,
			route: "login"
		});
	});

	hideBtn.addEventListener("click", () => {
		invoke("hide_settings").catch((error) => console.error("Failed to hide window:", error));
	});

	quitBtn.addEventListener("click", () => {
		invoke("quit_app").catch((error) => console.error("Failed to quit app:", error));
	});

	updateProfile();

	return () => {
		unsubscribe();
	};
};