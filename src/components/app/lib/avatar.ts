import { CDNElement } from "/scripts/services/discord/cdn.ts";
import { User, UserAvatarDecorationData } from "/scripts/services/discord/user.ts";

export type AvatarStatus = "online" | "idle" | "dnd" | "offline";

export interface AvatarOptions {
	user?: User<boolean> | {
		avatar?: CDNElement;
		avatar_decoration_data?: UserAvatarDecorationData;
	};
	size?: number;
	status?: AvatarStatus | null;
	withStatusCutout?: boolean;
	hoverElement?: HTMLElement;
};

export interface AvatarElement extends HTMLDivElement {
	play: () => void;
	stop: () => void;
	setStatus: (status: AvatarStatus | null) => void;
	setAvatar: (avatar?: CDNElement, decoration?: UserAvatarDecorationData) => void;
};

let avatarInstanceCounter = 0;

const resolveUserData = (source?: User<boolean> | { avatar?: CDNElement; avatar_decoration_data?: UserAvatarDecorationData }) => {
	if (!source) return { avatar: undefined, decoration: undefined };
	if ("user" in source && (source as any).user) {
		const avatar = (source as any).avatar ?? (source as any).user.avatar;
		const decoration = (source as any).avatar_decoration_data ?? (source as any).user.avatar_decoration_data;
		return { avatar, decoration };
	}
	return { avatar: source.avatar, decoration: source.avatar_decoration_data };
};

export const createAvatar = (options: AvatarOptions = {}): AvatarElement => {
	const instanceId = ++avatarInstanceCounter;
	const size = options.size ?? 256;
	const withStatusCutout = options.withStatusCutout ?? false;

	const avatarMaskId = `avatar-mask-${instanceId}`;
	const decorationMaskId = `avatar-decoration-mask-${instanceId}`;
	const statusMaskId = `status-icon-mask-${instanceId}`;

	const container = document.createElement("div") as AvatarElement;
	container.classList.add("avatar");

	let staticAvatarUrl: string | undefined;
	let animatedAvatarUrl: string | undefined;
	let staticDecorationUrl: string | undefined;
	let animatedDecorationUrl: string | undefined;

	const { avatar, decoration } = resolveUserData(options.user);

	if (avatar) {
		staticAvatarUrl = avatar.getURL(undefined, size, "high", undefined, false, false);
		animatedAvatarUrl = avatar.getURL(undefined, size, "high", undefined, undefined, true);
	}

	if (decoration) {
		staticDecorationUrl = decoration.asset.getURL("png", size, "high", undefined, false, false);
		animatedDecorationUrl = decoration.asset.getURL("png", size, "high", undefined, undefined, true);
	}

	const decorationMaskSVG = withStatusCutout ? `
		<defs>
			<mask id="${decorationMaskId}">
				<rect fill="white" width="100" height="100" />
				<circle fill="black" cx="79.17" cy="79.17" r="17" />
			</mask>
		</defs>
	` : "";

	const avatarMaskSVG = withStatusCutout ? `
		<defs>
			<mask id="${avatarMaskId}">
				<circle fill="white" cx="50" cy="50" r="50" />
				<circle fill="black" cx="85" cy="85" r="20" />
			</mask>
		</defs>
	` : `
		<defs>
			<mask id="${avatarMaskId}">
				<circle fill="white" cx="50" cy="50" r="50" />
			</mask>
		</defs>
	`;

	const statusIconSVG = (withStatusCutout || options.status) ? `
		<svg class="status-icon ${options.status ?? ""}" viewBox="0 0 100 100">
			<defs>
				<mask id="${statusMaskId}">
					<circle fill="white" cx="50" cy="50" r="50" />
					<circle class="cutout-moon" fill="black" cx="25" cy="25" r="0" />
					<circle class="cutout-ring" fill="black" cx="50" cy="50" r="0" />
					<rect class="cutout-bar" fill="black" x="12.5" y="50" width="75" height="0" rx="12.5" ry="12.5" />
				</mask>
			</defs>
			<circle class="status-fill" cx="50" cy="50" r="50" mask="url(#${statusMaskId})" />
		</svg>
	` : "";

	container.innerHTML = `
		<svg class="avatar-decoration ${decoration ? "" : "hidden"}" viewBox="0 0 100 100" aria-label="Avatar decoration">
			${decorationMaskSVG}
			<image class="image" width="100" height="100" ${withStatusCutout ? `mask="url(#${decorationMaskId})"` : ""} href="${staticDecorationUrl ?? ""}" />
			<image class="overlay" width="100" height="100" ${withStatusCutout ? `mask="url(#${decorationMaskId})"` : ""} href="${staticDecorationUrl ?? ""}" />
		</svg>
		<svg class="avatar-image" viewBox="0 0 100 100" aria-label="Avatar">
			${avatarMaskSVG}
			<image class="image" width="100" height="100" mask="url(#${avatarMaskId})" href="${staticAvatarUrl ?? ""}" />
			<image class="overlay" width="100" height="100" mask="url(#${avatarMaskId})" href="${staticAvatarUrl ?? ""}" />
		</svg>
		${statusIconSVG}
	`;

	const decorationSVG = container.querySelector("svg.avatar-decoration") as SVGSVGElement;
	const decorationImage = decorationSVG?.querySelector("image.image");
	const decorationOverlay = decorationSVG?.querySelector("image.overlay");
	const avatarImageSVG = container.querySelector("svg.avatar-image") as SVGSVGElement;
	const avatarImage = avatarImageSVG?.querySelector("image.image");
	const avatarOverlay = avatarImageSVG?.querySelector("image.overlay");
	const statusSVG = container.querySelector("svg.status-icon") as SVGSVGElement | null;

	let isPlaying = false;
	let stopTimeout: any = null;

	const play = () => {
		if (stopTimeout) {
			clearTimeout(stopTimeout);
			stopTimeout = null;
			isPlaying = true;
			container.classList.add("playing");
			return;
		}

		if (isPlaying) return;
		isPlaying = true;
		container.classList.add("playing");
		if (animatedAvatarUrl && avatarImage) {
			avatarImage.setAttribute("href", "");
			avatarImage.setAttribute("href", animatedAvatarUrl);
		}
		if (animatedDecorationUrl && decorationImage) {
			decorationImage.setAttribute("href", "");
			decorationImage.setAttribute("href", animatedDecorationUrl);
		}
	};

	const stop = () => {
		if (!isPlaying) return;
		isPlaying = false;
		container.classList.remove("playing");

		stopTimeout = setTimeout(() => {
			if (staticAvatarUrl && avatarImage) avatarImage.setAttribute("href", staticAvatarUrl);
			if (staticDecorationUrl && decorationImage) decorationImage.setAttribute("href", staticDecorationUrl);
			stopTimeout = null;
		}, 300);
	};

	const setStatus = (status: AvatarStatus | null) => {
		if (!statusSVG) return;
		statusSVG.classList.remove("online", "idle", "dnd", "offline", "hidden");
		if (status) statusSVG.classList.add(status);
		else statusSVG.classList.add("hidden");
	};

	const setAvatar = (newAvatar?: CDNElement, newDecoration?: UserAvatarDecorationData) => {
		if (newAvatar) {
			staticAvatarUrl = newAvatar.getURL(undefined, size, "high", undefined, false, false);
			animatedAvatarUrl = newAvatar.getURL(undefined, size, "high", undefined, undefined, true);
			avatarOverlay?.setAttribute("href", staticAvatarUrl);
			avatarImage?.setAttribute("href", isPlaying ? animatedAvatarUrl : staticAvatarUrl);
		}

		if (newDecoration) {
			staticDecorationUrl = newDecoration.asset.getURL("png", size, "high", undefined, false, false);
			animatedDecorationUrl = newDecoration.asset.getURL("png", size, "high", undefined, undefined, true);
			decorationOverlay?.setAttribute("href", staticDecorationUrl);
			decorationImage?.setAttribute("href", isPlaying ? animatedDecorationUrl : staticDecorationUrl);
			decorationSVG?.classList.remove("hidden");
		} else {
			staticDecorationUrl = undefined;
			animatedDecorationUrl = undefined;
			decorationOverlay?.removeAttribute("href");
			decorationImage?.removeAttribute("href");
			decorationSVG?.classList.add("hidden");
		}
	};

	container.play = play;
	container.stop = stop;
	container.setStatus = setStatus;
	container.setAvatar = setAvatar;

	const target = options.hoverElement ?? container;
	target.addEventListener("mouseenter", play);
	target.addEventListener("mouseleave", stop);

	return container;
};