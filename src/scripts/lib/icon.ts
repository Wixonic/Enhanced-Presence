import { Collection } from "/scripts/lib/utils.ts";

export class IconCollection extends Collection<string> {
	async fetch(name: string): Promise<string | undefined> {
		try {
			const response = await fetch(`/assets/icon/${name}.svg`);
			if (!response.ok) return undefined;
			return await response.text();
		} catch (error) {
			console.error(`Failed to fetch icon: ${name}`, error);
			return undefined;
		}
	};
};

export const icons = new IconCollection();

export const getIcon = async (name: string): Promise<string> => {
	return await icons.get(name) ?? "";
};