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
					if (baseName === filename) {
					audioEl.currentTime = time;
					audioEl.play();

					if (endTime !== undefined) {
					const onTimeUpdate = () => {
						if (audioEl.currentTime >= endTime) {
							audioEl.pause();
							audioEl.removeEventListener("timeupdate", onTimeUpdate);
						}
					};
					audioEl.addEventListener("timeupdate", onTimeUpdate);
					}
					audioEl.scrollIntoView({ behavior: "smooth", block: "center" });
					break;
				}
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