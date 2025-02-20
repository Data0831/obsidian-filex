import { TFile, TFolder, getAllTags } from 'obsidian';
import { ItemView } from 'obsidian';
import { FileXFilter } from './types';

export class FileAPI {
    rootPath: string;
    constructor(private view: ItemView) {
        this.rootPath = '';
    }

    isObsidianExtension(extension: string): boolean {
        return extension === 'md' || extension === 'canva';
    }

    getRoot(): TFolder {
        return this.view.app.vault.getRoot();
    }

    getAllMdFiles(): TFile[] {
        const files = this.view.app.vault.getMarkdownFiles();
        return files;
    }

    getAllTagNames(): string[] {
        const allFiles = this.getAllMdFiles();
        const allTags = new Set<string>();

        // 添加特殊標籤 |no-tag
        allTags.add('|no-tag');

        for (const file of allFiles) {
            const cache = this.view.app.metadataCache.getFileCache(file);
            if (cache) {
                const tags = getAllTags(cache);
                if (tags) {
                    for (const tag of tags) {
                        allTags.add(tag);
                    }
                }
            }
        }
        return Array.from(allTags).sort();
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

    filterItems(files: TFile[], filter: FileXFilter): TFile[] {
        return files.filter(file => {
            // 搜尋文字過濾
            if (filter.searchText && filter.searchText.trim() !== '') {  // 只在有搜尋文字時過濾
                const searchLower = filter.searchText.toLowerCase();
                if (!file.name.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            // 標籤過濾
            if (filter.tags && filter.tags.length > 0) {
                const cache = this.view.app.metadataCache.getFileCache(file);
                if (!cache) return false;
                
                // 處理 |no-tag 特殊標籤
                if (filter.tags.includes('|no-tag')) {
                    const tags = getAllTags(cache);
                    return !tags || tags.length === 0;
                }
                
                // 一般標籤過濾
                const fileTags = getAllTags(cache);
                if (!fileTags || !filter.tags.some(tag => fileTags.includes(tag))) {
                    return false;
                }
            }

            // 資料夾路徑過濾
            if (filter.folderPath && filter.folderPath.trim() !== '') {  // 只在有路徑時過濾
                if (!file.path.startsWith(filter.folderPath)) {
                    return false;
                }
            }

            return true;
        });
    }

    filterFolders(folders: TFolder[], filter: FileXFilter): TFolder[] {
        return folders.filter(folder => {
            if (filter.searchText) {
                const searchLower = filter.searchText.toLowerCase();
                return folder.name.toLowerCase().includes(searchLower);
            }
            return true;
        });
    }

    getUnlinkedFiles(): TFile[] {
        const allFiles = this.getAllFiles();
        const mdFiles = this.getAllMdFiles();
        const attachments = allFiles.filter(file =>
            file.extension !== 'md' &&
            file.extension !== 'canva'
        );

        // 獲取所有 markdown 檔案中的連結
        const allLinks = new Set<string>();
        mdFiles.forEach(mdFile => {
            const cache = this.view.app.metadataCache.getFileCache(mdFile);
            if (cache) {
                // 檢查嵌入連結
                cache.embeds?.forEach(embed => {
                    allLinks.add(embed.link);
                });
                // 檢查一般連結
                cache.links?.forEach(link => {
                    allLinks.add(link.link);
                });
            }
        });

        // 過濾出未被連結的檔案
        return attachments.filter(file => {
            // 檢查檔案名稱是否在連結中
            const isLinked = Array.from(allLinks).some(link => {
                return link.includes(file.basename) || link.includes(file.path);
            });
            return !isLinked;
        });
    }
}



