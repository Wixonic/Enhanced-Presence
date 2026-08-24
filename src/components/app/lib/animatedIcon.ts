export interface AnimatedIconElement extends HTMLDivElement {
	play: () => void;
	stop: () => void;
};

export const animateIcon = (staticIcon: string, animatedIcon: string, hoverElement?: HTMLElement): AnimatedIconElement => {
	const wrapper = document.createElement("div") as AnimatedIconElement;
	wrapper.classList.add("icon", "animated");
	wrapper.style.setProperty("--static-icon", `url(${staticIcon})`);

	const image = document.createElement("img");
	image.src = staticIcon;

	let isPlaying = false;
	let stopTimeout: any = null;

	const play = () => {
		if (stopTimeout) {
			clearTimeout(stopTimeout);
			stopTimeout = null;
			isPlaying = true;
			wrapper.classList.add("playing");
			return;
		}

		if (isPlaying) return;
		isPlaying = true;
		wrapper.classList.add("playing");
		image.src = "";
		image.src = animatedIcon;
	};

	const stop = () => {
		if (!isPlaying) return;
		isPlaying = false;
		wrapper.classList.remove("playing");

		stopTimeout = setTimeout(() => {
			image.src = staticIcon;
			stopTimeout = null;
		}, 300);
	};

	wrapper.play = play;
	wrapper.stop = stop;

	const target = hoverElement ?? wrapper;
	target.addEventListener("mouseenter", play);
	target.addEventListener("mouseleave", stop);

	wrapper.appendChild(image);
	return wrapper;
};
