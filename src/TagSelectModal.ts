import { App, Modal, Setting } from 'obsidian';

export class TagSelectModal extends Modal {
    private selectedTag: string = '';
    private onSelect: (tag: string) => void;

    constructor(app: App, private tags: string[], onSelect: (tag: string) => void) {
        super(app);
        this.onSelect = onSelect;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h3', { text: '選擇標籤' });

        new Setting(contentEl)
            .setName('標籤')
            .addDropdown(dropdown => {
                this.tags.forEach(tag => {
                    dropdown.addOption(tag, tag);
                });
                dropdown.onChange(value => {
                    this.selectedTag = value;
                });
                if (this.tags.length > 0) {
                    this.selectedTag = this.tags[0];
                    dropdown.setValue(this.tags[0]);
                }
            });

        new Setting(contentEl)
            .addButton(button => {
                button.setButtonText('確認')
                    .setCta()
                    .onClick(() => {
                        if (this.selectedTag) {
                            this.onSelect(this.selectedTag);
                            this.close();
                        }
                    });
            })
            .addButton(button => {
                button.setButtonText('取消')
                    .onClick(() => {
                        this.close();
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 