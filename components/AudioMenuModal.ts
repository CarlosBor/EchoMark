import { Modal, App, MarkdownView } from 'obsidian';
import { AudioInfo } from './Interfaces';

class AudioMenuModal extends Modal {
	audioInfoArray: AudioInfo[];

	constructor(app: App, audioInfoArray: AudioInfo[]) {
		super(app);
		this.audioInfoArray = audioInfoArray;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.setAttr('style', 'display: flex; flex-direction: column; gap: 8px; flex-wrap: wrap; margin-top: 8px;');

		this.audioInfoArray.forEach(audioInfo => {
			const btn = contentEl.createEl('button', { text: audioInfo.name });
			btn.onclick = () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				const marker = `[audio:${audioInfo.name}@]`;
				editor.replaceSelection(marker);
				this.close();
			};
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

export default AudioMenuModal;