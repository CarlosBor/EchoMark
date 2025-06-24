import {
	MarkdownView,
	Notice,
	Plugin,
} from "obsidian";
import AudioMenuModal from "components/AudioMenuModal";
import { TFile } from "obsidian";
import { AudioInfo } from "components/Interfaces";

export default class MyPlugin extends Plugin {

	getEmbeddedAudio = async () => {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("No active note");
			return;
		}
		const audioInfoArray: AudioInfo[] = [];
		const file = view.file;
		if (!file) {
			new Notice("No file in active note");
			return;
		}
		const content = await this.app.vault.read(file as TFile);
		const matches = content.matchAll(/!\[\[(.+?)\]\]/g);

		for (const match of matches) {
			const link = match[1];
			const tfile = this.app.metadataCache.getFirstLinkpathDest(
				link,
				file.path
			);
			if (tfile && tfile instanceof TFile && tfile.extension === "mp3") {
				const fileName = tfile.name;
				const src = tfile.path;
				audioInfoArray.push({ name: fileName, src });
			}
		}
		new AudioMenuModal(this.app, audioInfoArray).open();
	};

addSegmentOverlay(audioEl: HTMLAudioElement, start: number, end?: number) {
	const duration = audioEl.duration;
	if (!isFinite(duration) || duration <= 0) return;
	const overlay = document.createElement("div");
	overlay.style.position = "absolute";
	overlay.style.background = "rgba(255, 0, 0, 0.4)";
	overlay.style.pointerEvents = "none";
	overlay.style.borderRadius = "4px";
	overlay.style.zIndex = "9999";

	// Attempt to locate the seekbar input element
	const rect = audioEl.getBoundingClientRect();
	const seekbarLeft = rect.left + window.scrollX+130;
	const seekbarTop = rect.top + window.scrollY + rect.height * 0.4; // Approx bottom 20%
	const seekbarWidth = rect.width*0.685;

	const startRatio = start / duration;
	const endRatio = end !== undefined ? Math.min(end / duration, 1) : 1;

	const barLeft = seekbarLeft + seekbarWidth * startRatio;
	const barWidth = seekbarWidth * (endRatio - startRatio);

	overlay.style.left = `${barLeft}px`;
	overlay.style.top = `${seekbarTop}px`;
	overlay.style.width = `${barWidth}px`;
	overlay.style.height = `${rect.height*0.2}px`;

	document.body.appendChild(overlay);

	const removeOverlay = () => {
		overlay.remove();
		audioEl.removeEventListener("pause", removeOverlay);
		audioEl.removeEventListener("ended", removeOverlay);
	};

	audioEl.addEventListener("pause", removeOverlay);
	audioEl.addEventListener("ended", removeOverlay);
}


replaceAudioMarkers(node: Node, plugin: MyPlugin, rootEl: HTMLElement) {
	if (node.nodeType === Node.TEXT_NODE) {
		const text = node.textContent ?? "";
		const regex = /\[audio:([^\]@]+)@(\d+)(?:-(\d+))?\]/g;		let match;
		let lastIndex = 0;
		const parent = node.parentNode;
		if (!parent) return;
		const frag = document.createDocumentFragment();

		while ((match = regex.exec(text)) !== null) {
			frag.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));

			const filename = match[1];
			const time = Number(match[2]);
			const endTime = match[3] ? Number(match[3]) : undefined;

			const btn = document.createElement("button");
			btn.textContent = `Play ${filename} @ ${time}s`;

			// Closure explicitly captures top-level rootEl here
btn.onclick = () => {
	const audios = rootEl.querySelectorAll("audio");
	for (const audioEl of audios) {
		const src = audioEl.getAttribute("src") ?? audioEl.currentSrc;
		if (!src) continue;
		const baseName = decodeURIComponent(src.split("/").pop()?.split("?")[0] ?? "");
		if (baseName !== filename) continue;

		audioEl.currentTime = time;
		audioEl.play();
		audioEl.scrollIntoView({ behavior: "smooth", block: "center" });

		// Stop at endTime if defined
		if (endTime !== undefined) {
			const onTimeUpdate = () => {
				if (audioEl.currentTime >= endTime) {
					audioEl.pause();
					audioEl.removeEventListener("timeupdate", onTimeUpdate);
					audioEl.removeEventListener("pause", onPause);
				}
			};
			const onPause = () => {
				audioEl.removeEventListener("timeupdate", onTimeUpdate);
				audioEl.removeEventListener("pause", onPause);
			};
			audioEl.addEventListener("timeupdate", onTimeUpdate);
			audioEl.addEventListener("pause", onPause);
		}

		// Wait for metadata to load if needed
		if (audioEl.readyState < 1) {
			audioEl.addEventListener("loadedmetadata", () => {
				this.addSegmentOverlay(audioEl, time, endTime);
			}, { once: true });
		} else {
			this.addSegmentOverlay(audioEl, time, endTime);
		}

		break;
	}
};



			frag.appendChild(btn);
			lastIndex = regex.lastIndex;
		}

		frag.appendChild(document.createTextNode(text.substring(lastIndex)));
		parent.replaceChild(frag, node);
	} else if (node.nodeType === Node.ELEMENT_NODE) {
		// Propagate the original rootEl
		node.childNodes.forEach((child) =>
			this.replaceAudioMarkers(child, plugin, rootEl)
		);
	}
}

	async onload() {
		// This creates a clickable icon in the left ribbon.
		this.addRibbonIcon(
			"dice",
			"TextForButton",
			(evt: MouseEvent) => {this.getEmbeddedAudio()}
		);

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		this.registerMarkdownPostProcessor((el, ctx) => {
			// @ts-ignore
			const rootEl = ctx.containerEl.closest(".markdown-preview-view");
			if (!rootEl) return;
			this.replaceAudioMarkers(el, this, rootEl);
		});
	}

	onunload() {}
}