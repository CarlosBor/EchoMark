import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import AudioMenuModal from "components/AudioMenuModal";
import { TFile } from "obsidian";
import { AudioInfo } from "components/Interfaces";
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	anotherSetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "deft",
	anotherSetting: "more deft",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

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
			const link = match[1]; // e.g., "audio.mp3" or "folder/audio.mp3"
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

	replaceAudioMarkers(node: Node, plugin: MyPlugin) {
		if (node.nodeType === Node.TEXT_NODE) {
			const text = node.textContent ?? "";
			const regex = /\[audio:([^\]@]+)@(\d+)\]/g;
			let match;
			let lastIndex = 0;
			const parent = node.parentNode;
			if (!parent) return;
			const frag = document.createDocumentFragment();

			while ((match = regex.exec(text)) !== null) {
				frag.appendChild(
					document.createTextNode(
						text.substring(lastIndex, match.index)
					)
				);

				const filename = match[1];
				const time = Number(match[2]);
				const btn = document.createElement("button"); // <-- declare btn here
				btn.textContent = `Play ${filename} @ ${time}s`;
				btn.onclick = () => {
					const mdView =
						plugin.app.workspace.getActiveViewOfType(MarkdownView);
					if (!mdView) return;

					const container = mdView.contentEl;
					const embeds =
						container.querySelectorAll(".internal-embed");

					for (const embed of embeds) {
						const audioEl = embed.querySelector("audio");
						if (!audioEl) continue;

						const embedSrc =
							embed.getAttribute("src") ||
							embed.getAttribute("data-src");
						if (!embedSrc) continue;

						const baseName = decodeURIComponent(
							embedSrc.split("/").pop()?.split("?")[0] ?? ""
						);
						if (baseName === filename) {
							audioEl.currentTime = time;
							audioEl.play();
							audioEl.scrollIntoView({
								behavior: "smooth",
								block: "center",
							});
							break;
						}
					}
				};

				frag.appendChild(btn);
				lastIndex = regex.lastIndex;
			}

			frag.appendChild(
				document.createTextNode(text.substring(lastIndex))
			);
			parent.replaceChild(frag, node);
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			node.childNodes.forEach((child) =>
				this.replaceAudioMarkers(child, plugin)
			);
		}
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"TextForButton",
			(evt: MouseEvent) => {
				this.getEmbeddedAudio();
			}
		);

		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("This text belongs to the test plugin");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		this.registerMarkdownPostProcessor((el) => {
			this.replaceAudioMarkers(el, this);
		});
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Setting #2")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.anotherSetting)
					.onChange(async (value) => {
						this.plugin.settings.anotherSetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
