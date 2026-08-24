import { Color } from "/scripts/lib/utils.ts";
import { DisplayNameStyle, UserDisplayNameStyle } from "/scripts/services/discord/user.ts";

export type DisplayNameMode = "full" | "font-only";

export const createDisplayName = (name: string, style?: DisplayNameStyle | UserDisplayNameStyle, mode: DisplayNameMode = "full", tag: "span" | "div" = "span"): HTMLElement => {
	if (!style) {
		const element = document.createElement(tag);
		element.textContent = name;
		return element;
	};

	const fontId = typeof style === "number" ? style : style.font_id;
	const effectId = typeof style === "number" ? undefined : style.effect_id;
	const colors = typeof style === "number" ? undefined : style.colors;

	const container = document.createElement(tag);
	container.classList.add("discord-name-style-container");

	const inner = document.createElement("span");
	inner.classList.add("discord-name-style-inner", `discord-name-style-font-${fontId}`);
	inner.dataset.username = name;
	inner.textContent = name;

	if (mode === "full" && effectId) {
		inner.classList.add(`discord-name-style-effect-${effectId}`);
		if (colors && colors.length > 0) {
			colors.forEach((color, index) => {
				const hex = color instanceof Color ? color.hex : typeof color === "number" ? new Color(color).hex : String(color);
				container.style.setProperty(`--discord-name-style-color-${index + 1}`, hex);
				inner.style.setProperty(`--discord-name-style-color-${index + 1}`, hex);
			});
			const primaryHex = colors[0] instanceof Color ? colors[0].hex : typeof colors[0] === "number" ? new Color(colors[0]).hex : String(colors[0]);
			if (colors.length === 1) {
				container.style.setProperty("--discord-name-style-color-2", primaryHex);
				inner.style.setProperty("--discord-name-style-color-2", primaryHex);
			};
			container.style.setProperty("--discord-name-style-main-color", primaryHex);
			inner.style.setProperty("--discord-name-style-main-color", primaryHex);
		};
	};

	container.appendChild(inner);
	return container;
};
