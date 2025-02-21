import { Menu, TAbstractFile, TFile, TFolder, Modal, Setting } from 'obsidian';
import { FileXView } from './FileXView';

class InputModal extends Modal {
    private result: string;
    private onSubmit: (result: string) => void;

    constructor(app: any, defaultValue: string, onSubmit: (result: string) => void) {
        super(app);
        this.result = defaultValue;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "Enter name" });

        new Setting(contentEl)
            .setName("Name")
            .addText((text) =>
                text
                    .setValue(this.result)
                    .onChange((value) => {
                        this.result = value
                    }));

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Submit")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                    }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class FileXMenu {
    constructor(private view: FileXView) {}

    showMenu(e: MouseEvent, file: TAbstractFile) {
        const menu = new Menu();

        if (file instanceof TFolder) {
            this.addFolderMenuItems(menu, file);
        }

        this.addCommonMenuItems(menu, file);
        
        // 添加分隔線
        menu.addSeparator();

        // 觸發 Obsidian 的檔案選單事件以獲取其他選單項目
        this.view.app.workspace.trigger('file-menu', menu, file, 'file-explorer');
        
        menu.showAtPosition({ x: e.x, y: e.y });
        return menu;
    }

    private addFolderMenuItems(menu: Menu, folder: TFolder) {
        menu.addItem((item) => {
            item.setIcon("document")
                .setTitle("New note")
                .onClick(() => {
                    new InputModal(this.view.app, "Untitled.md", async (result) => {
                        await this.view.app.vault.create(folder.path + "/" + result, "");
                        this.view.refresh();
                    }).open();
                });
        });

        menu.addItem((item) => {
            item.setIcon("folder")
                .setTitle("New folder")
                .onClick(() => {
                    new InputModal(this.view.app, "New folder", async (result) => {
                        await this.view.app.vault.createFolder(folder.path + "/" + result);
                        this.view.refresh();
                    }).open();
                });
        });
    }

    private addCommonMenuItems(menu: Menu, file: TAbstractFile) {
        menu.addItem((item) => {
            item.setIcon("pencil")
                .setTitle("Rename...")
                .onClick(() => {
                    new InputModal(this.view.app, file.name, async (result) => {
                        const newPath = await this.view.app.vault.rename(
                            file, 
                            file.path.replace(file.name, result)
                        );
                        this.view.refresh();
                    }).open();
                });
        });

        menu.addItem((item) => {
            item.setIcon("trash")
                .setTitle("Delete")
                .onClick(async () => {
                    await this.view.app.vault.trash(file, true);
                    this.view.refresh();
                });
        });
    }
}