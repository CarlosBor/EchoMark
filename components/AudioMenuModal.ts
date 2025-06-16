import { Modal, App } from 'obsidian';
import { AudioInfo } from './interfaces';
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
			console.log('Selected audio:', audioInfo.src);
			this.close();
		};
	});
}

  onClose() {
    this.contentEl.empty();
  }
}

export default AudioMenuModal;