import { store } from "/scripts/lib/store.ts";

import html from "./login.html";

export const renderLogin = (container: HTMLElement): (() => void) => {
	document.body.setAttribute("state", "login");
	container.innerHTML = html;

	const tokenInput = container.querySelector("#token") as HTMLInputElement;
	tokenInput.addEventListener("keydown", async (event) => {
		if (event.key === "Enter") {
			event.preventDefault();
			const token = tokenInput.value.trim();
			store.setState({ token });
		}
	});

	return () => { };
};