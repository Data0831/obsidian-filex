import { TFile, TFolder, getAllTags } from 'obsidian';
import { ItemView } from 'obsidian';

export class FileAPI {
    rootPath: string;
    constructor(private view: ItemView) {
        this.rootPath = '';
    }

    getRoot(): TFolder {
        return this.view.app.vault.getRoot();
    }

    getAllMdFiles(): TFile[] {
        const files = this.view.app.vault.getMarkdownFiles();
        return files;
    }

    getAllTagNames(): string[] {
        const allFiles = this.getAllMdFiles(); // 獲取 vault 中的所有檔案
        const allTags = new Set<string>(); // 創建一個 Set 來儲存唯一的標籤


        for (const file of allFiles) { // 遍歷每個檔案
            const cache = this.view.app.metadataCache.getFileCache(file); // 獲取檔案的快取資料 (包含標籤資訊)
            if (cache) { // 確保快取存在
                const tags = getAllTags(cache); // 使用 getAllTags 函式獲取檔案中的所有標籤
                if (tags) { // 確保檔案有標籤
                    for (const tag of tags) { // 遍歷檔案中的每個標籤
                        allTags.add(tag); // 將標籤添加到 Set 中 (Set 會自動處理重複的標籤，只保留唯一的)
                    }
                }
            }
        }
        return Array.from(allTags).sort( // todo lenth 與 localeCompare 的順序
            (a, b) => {
                if (a.length < b.length) {
                    return -1;
                } else if (a.length > b.length) {
                    return 1;
                } else {
                    return a.localeCompare(b);
                }
            }
        );
    }


    getAllAttachments(): TFile[] { // 取得所有附件
        const files = this.view.app.vault.getFiles();
        return files.filter(file => !(file instanceof TFile && file.extension === 'md'));
    }

    getAllFiles(): TFile[] {
        const files = this.view.app.vault.getFiles();
        return files;
    }

    getAllFoders(): TFolder[] {
        const folders = this.view.app.vault.getAllFolders();
        return folders;
    }

    getMdFilesByFolderPath(folderPath: string) {
        const files = this.view.app.vault.getMarkdownFiles();
        return files.filter(file => file.path.startsWith(folderPath));
    }

    getTFolderByFolderPath(folderPath: string) {
        return this.view.app.vault.getFolderByPath(folderPath);
    }

    sortFolder(folders: TFolder[]): TFolder[] {
        return folders.sort((a, b) => {
            if (a.name[0].match(/[a-zA-Z]/) && !b.name[0].match(/[a-zA-Z]/)) {
                return 1;
            } else if (!a.name[0].match(/[a-zA-Z]/) && b.name[0].match(/[a-zA-Z]/)) {
                return -1;
            } else {
                return a.name.localeCompare(b.name);
            }
        });

    }

    sortFile(files: TFile[]): TFile[] {
        return files.sort((a, b) => {

            if (a.extension == 'md' && b.extension != 'md') {
                return -1;
            } else if (a.extension != 'md' && b.extension == 'md') {
                return 1;
            } else {
                const aName = a.name.toLowerCase();
                const bName = b.name.toLowerCase();
                return aName.localeCompare(bName);
            }
        });
    }
}



