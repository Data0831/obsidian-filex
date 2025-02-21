import { Menu, TAbstractFile, TFile, TFolder, Modal, Setting, Notice } from 'obsidian';
import { FileXView } from './FileXView';

class InputModal extends Modal {
    private result: string;
    private onSubmit: (result: string) => void;
    private path: string;
    private operation: string;
    private nameInput: HTMLInputElement;
    private extensionInput: HTMLInputElement;
    private originalExtension: string;

    constructor(app: any, defaultValue: string, path: string, operation: string, onSubmit: (result: string) => void) {
        super(app);
        this.result = defaultValue;
        this.path = path;
        this.operation = operation;
        this.onSubmit = onSubmit;
        
        // 取得原始副檔名
        const lastDotIndex = defaultValue.lastIndexOf('.');
        this.originalExtension = lastDotIndex > -1 ? defaultValue.slice(lastDotIndex) : '';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: this.operation });
        contentEl.createEl("p", { text: `路徑: ${this.path}`, cls: "modal-path" });

        // 分割檔名和副檔名
        const lastDotIndex = this.result.lastIndexOf('.');
        const baseName = lastDotIndex > -1 ? this.result.slice(0, lastDotIndex) : this.result;
        const extension = this.originalExtension;

        // 檔名輸入欄位
        const nameInputContainer = new Setting(contentEl).setName("名稱");
        const nameInputEl = nameInputContainer.addText((text) => {
            text.setValue(baseName);
            text.onChange((value) => {
                this.updateResult();
            });
            return text;
        }).settingEl.querySelector('input');
        
        if (!nameInputEl) throw new Error("無法創建名稱輸入欄位");
        this.nameInput = nameInputEl;

        // 副檔名輸入欄位（如果有副檔名）
        if (this.originalExtension) {
            const extensionInputContainer = new Setting(contentEl).setName("副檔名");
            const extensionInputEl = extensionInputContainer.addText((text) => {
                text.setValue(extension);
                text.setDisabled(true);
                text.onChange((value) => {
                    this.updateResult();
                });
                return text;
            }).settingEl.querySelector('input');
            
            if (!extensionInputEl) throw new Error("無法創建副檔名輸入欄位");
            this.extensionInput = extensionInputEl;

            // 允許編輯副檔名的 checkbox
            new Setting(contentEl)
                .setName("允許編輯副檔名")
                .addToggle((toggle) => {
                    toggle.setValue(false);
                    toggle.onChange((value) => {
                        this.extensionInput.disabled = !value;
                        if (!value) {
                            this.extensionInput.value = this.originalExtension;
                            this.updateResult();
                        }
                    });
                });
        }

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("提交")
                    .setCta()
                    .onClick(() => {
                        this.close();
                        this.onSubmit(this.result);
                        new Notice(`${this.operation} 完成：${this.result}`);
                    }));
    }

    private updateResult() {
        if (this.originalExtension && this.extensionInput) {
            const extension = this.extensionInput.value.startsWith('.') ? 
                this.extensionInput.value : 
                '.' + this.extensionInput.value;
            this.result = this.nameInput.value + extension;
        } else {
            this.result = this.nameInput.value;
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        new Notice(`已關閉 ${this.operation} 視窗`);
    }
}

class DeleteConfirmModal extends Modal {
    private onConfirm: () => void;
    private fileName: string;

    constructor(app: any, fileName: string, onConfirm: () => void) {
        super(app);
        this.fileName = fileName;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "確認刪除" });
        contentEl.createEl("p", { text: `確定要刪除 "${this.fileName}" 嗎？`, cls: "delete-warning" });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("取消")
                    .onClick(() => {
                        this.close();
                    }))
            .addButton((btn) =>
                btn
                    .setButtonText("刪除")
                    .setWarning()
                    .onClick(() => {
                        this.close();
                        this.onConfirm();
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
                .setTitle("新增筆記")
                .onClick(() => {
                    new InputModal(
                        this.view.app, 
                        "Untitled.md", 
                        folder.path, 
                        "新增筆記",
                        async (result) => {
                            await this.view.app.vault.create(folder.path + "/" + result, "");
                            this.view.refresh(true);
                        }
                    ).open();
                });
        });

        menu.addItem((item) => {
            item.setIcon("folder")
                .setTitle("新增資料夾")
                .onClick(() => {
                    new InputModal(
                        this.view.app, 
                        "New folder", 
                        folder.path,
                        "新增資料夾",
                        async (result) => {
                            await this.view.app.vault.createFolder(folder.path + "/" + result);
                            this.view.refresh(true);
                        }
                    ).open();
                });
        });
    }

    private addCommonMenuItems(menu: Menu, file: TAbstractFile) {
        menu.addItem((item) => {
            item.setIcon("pencil")
                .setTitle("重新命名...")
                .onClick(() => {
                    new InputModal(
                        this.view.app, 
                        file.name, 
                        file.path,
                        "重新命名",
                        async (result) => {
                            const newPath = await this.view.app.vault.rename(
                                file, 
                                file.path.replace(file.name, result)
                            );
                            this.view.refresh(true);
                        }
                    ).open();
                });
        });

        menu.addItem((item) => {
            const menuItem = item
                .setIcon("trash")
                .setTitle("刪除")
                .onClick(() => {
                    new DeleteConfirmModal(
                        this.view.app,
                        file.name,
                        async () => {
                            await this.view.app.vault.trash(file, true);
                            this.view.refresh(true);
                            new Notice(`已刪除：${file.name}`);
                        }
                    ).open();
                });
        });
    }
}