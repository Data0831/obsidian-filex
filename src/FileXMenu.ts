import { Menu, TAbstractFile, TFile, TFolder } from 'obsidian';
import { FileXControlView } from './FileXControlView';

export class FileXMenu {
    constructor(private view: FileXControlView) {}

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
                .onClick(async () => {
                    await this.view.app.vault.create(folder.path + "/Untitled.md", "");
                });
        });

        menu.addItem((item) => {
            item.setIcon("folder")
                .setTitle("New folder")
                .onClick(async () => {
                    await this.view.app.vault.createFolder(folder.path + "/New folder");
                });
        });
    }

    private addCommonMenuItems(menu: Menu, file: TAbstractFile) {
        menu.addItem((item) => {
            item.setIcon("pencil")
                .setTitle("Rename...")
                .onClick(async () => {
                    const newPath = await this.view.app.vault.rename(file, file.path.replace(file.name, "Untitled"));
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