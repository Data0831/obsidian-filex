import { Notice, TFile, TFolder, getAllTags } from 'obsidian';
import { ItemView } from 'obsidian';
import { Filter, Action, noneFileFilter } from './Filter';
import * as YAML from 'yaml';
import { SegmentKey } from './FileXHtml';
import { Debug } from './Lib';

export interface FileAndFolder {
    files: TFile[];
    folders: TFolder[];
}

export interface FileAndFolderCounter {
    folderCount: number;
    mdFileCount: number;
    canvaFileCount: number;
    attachmentFileCount: number;
}

export class FileAPI {
    private oldFilter: Filter = noneFileFilter.createNewCopy();
    public fileAndFolder: FileAndFolder = { files: [], folders: [] };
    private tagsFiles: Record<string, TFile[]> = {};
    
    constructor(private view: ItemView) { }

    private get fileExtensions() {
        return {
            md: 'md',
            canvas: 'canvas'
        };
    }

    private checkFileExtension(file: TFile, ext: string): boolean {
        return file.extension === ext;
    }

    isMdExtension = (file: TFile): boolean => this.checkFileExtension(file, this.fileExtensions.md);
    isCanvaExtension = (file: TFile): boolean => this.checkFileExtension(file, this.fileExtensions.canvas);
    isObExtension = (file: TFile): boolean => this.isMdExtension(file) || this.isCanvaExtension(file);

    getUnlinkedFiles(): TFile[] {
        const attachments = this.view.app.vault.getFiles().filter(file => !this.isObExtension(file));
        const allLinks = new Set<string>();
        
        this.view.app.vault.getMarkdownFiles().forEach(mdFile => {
            const cache = this.view.app.metadataCache.getFileCache(mdFile);
            if (cache) {
                cache.embeds?.forEach(embed => allLinks.add(embed.link));
                cache.links?.forEach(link => allLinks.add(link.link));
            }
        });

        Debug.log("allLinks", allLinks);
        return attachments.filter(file => 
            !Array.from(allLinks).some(link => 
                link.includes(file.basename) || link.includes(file.path)
            )
        );
    }

    showFilter(filter: Filter): FileAndFolder {
        const result: FileAndFolder = { 
            files: [], 
            folders: filter.showFolder ? this.sortFolder(this.fileAndFolder.folders) : [] 
        };

        result.files = this.fileAndFolder.files.filter(file => 
            (filter.showMdAndCanvas && this.isObExtension(file)) ||
            (filter.showAttachment && !this.isObExtension(file))
        );

        result.files = this.sortFile(result.files);
        return result;
    }

    getFileAndFolderByFilter(filter: Filter): FileAndFolder {
        Debug.log("filter", filter);
        
        if (filter.filterEquality(this.oldFilter)) {
            return this.showFilter(filter);
        }

        this.oldFilter.copyValue(filter);
        this.fileAndFolder = { files: [], folders: [] };

        switch (filter.action) {
            case Action.Search:
                this.handleSearchAction(filter);
                break;
            case Action.Segment:
                this.handleSegmentAction(filter);
                break;
            case Action.Folder:
                this.handleFolderAction(filter);
                break;
            case Action.Tag:
                this.fileAndFolder.files = this.tagsFiles[filter.tags[0]] || [];
                break;
        }

        return this.showFilter(filter);
    }

    private handleSearchAction(filter: Filter) {
        const searchText = filter.searchText!.toLowerCase();
        this.fileAndFolder.files = this.view.app.vault.getFiles()
            .filter(file => file.name.toLowerCase().includes(searchText));
        this.fileAndFolder.folders = this.view.app.vault.getAllFolders()
            .filter(folder => folder.name.toLowerCase().includes(searchText));
    }

    private handleSegmentAction(filter: Filter) {
        switch (filter.segment) {
            case SegmentKey.Vault:
                const rootFolder = this.view.app.vault.getRoot();
                this.fileAndFolder = {
                    folders: rootFolder.children.filter(folder => folder instanceof TFolder),
                    files: rootFolder.children.filter(file => file instanceof TFile)
                };
                break;
            case SegmentKey.FolderL2:
                this.fileAndFolder.folders = this.view.app.vault.getAllFolders()
                    .filter(folder => folder.path.split('/').length == 2);
                break;
            case SegmentKey.AllFiles:
                this.fileAndFolder.files = this.view.app.vault.getFiles();
                break;
            case SegmentKey.UnLinked:
                this.fileAndFolder.files = this.getUnlinkedFiles();
                break;
        }
    }

    private handleFolderAction(filter: Filter) {
        const folder = this.getTFolderByFolderPath(filter.folderPath!);
        if (folder) {
            this.fileAndFolder = {
                files: folder.children.filter(file => file instanceof TFile),
                folders: folder.children.filter(folder => folder instanceof TFolder)
            };
        }
    }

    public async saveFileFrontmatter(file: TFile, map: Record<string, any>) {
        try {
            const content = await this.view.app.vault.read(file);
            const frontmatter = this.view.app.metadataCache.getFileCache(file)?.frontmatter;

            if (frontmatter) {
                Object.assign(frontmatter, map);
                const newFrontmatterStr = YAML.stringify(frontmatter);
                const newContent = content.replace(/^---\n([\s\S]*?)\n---/, `---\n${newFrontmatterStr}---`);
                await this.view.app.vault.modify(file, newContent);
                new Notice(`檔案 ${file.basename} 的 frontmatter 已更新`);
            } else {
                const newFrontmatter = YAML.stringify(map);
                const newContent = `---\n${newFrontmatter}---\n\n${content}`;
                await this.view.app.vault.modify(file, newContent);
                new Notice(`檔案 ${file.basename} 添加新的 frontmatter`);
            }
        } catch (error) {
            new Notice(`更新 frontmatter 失敗: ${error.message}`);
            console.error('Error updating frontmatter:', error);
        }
    }
    
    public calculateFileCountInFolder(folder: TFolder): FileAndFolderCounter {
        const count: FileAndFolderCounter = { folderCount: 0, mdFileCount: 0, canvaFileCount: 0, attachmentFileCount: 0 };
        folder.children.forEach(child => {
            if (child instanceof TFile) {
                if (this.isMdExtension(child)) {
                    count.mdFileCount++;
                } else if (this.isCanvaExtension(child)) {
                    count.canvaFileCount++;
                } else {
                    count.attachmentFileCount++;
                }
            }
        });
        return count;
    }

    public getTotalFileCount(): FileAndFolderCounter {
        const count: FileAndFolderCounter = { folderCount: 0, mdFileCount: 0, canvaFileCount: 0, attachmentFileCount: 0 };
        this.view.app.vault.getFiles().forEach(file => {
            if (this.isMdExtension(file)) {
                count.mdFileCount++;
            } else if (this.isCanvaExtension(file)) {
                count.canvaFileCount++;
            } else {
                count.attachmentFileCount++;
            }
        });
        return count;
    }

    getAllTagNames(): string[] {
        this.tagsFiles = { '|no-tag': [] };
  
        this.view.app.vault.getMarkdownFiles().forEach(file => {
            const cache = this.view.app.metadataCache.getFileCache(file);
            if (cache) {
                const tags = getAllTags(cache);
                if (tags) {
                    for (const tag of tags) {
                        this.tagsFiles[tag] = this.tagsFiles[tag] || [];
                        this.tagsFiles[tag].push(file);
                    }
                } else {
                    this.tagsFiles['|no-tag'].push(file);
                }
            }
        });
        return this.sortTags(Object.keys(this.tagsFiles));
    }

    getRootFolder = (): TFolder => this.view.app.vault.getRoot();

    getMdFilesByFolderPath = (folderPath: string): TFile[] => 
        this.view.app.vault.getMarkdownFiles().filter(file => file.path.startsWith(folderPath));

    getTFolderByFolderPath = (folderPath: string): TFolder | null => 
        this.view.app.vault.getFolderByPath(folderPath);

    private sortByAlphabet = (a: string, b: string): number => {
        const isALetter = a[0].match(/[a-zA-Z]/);
        const isBLetter = b[0].match(/[a-zA-Z]/);
        
        if (isALetter && !isBLetter) return 1;
        if (!isALetter && isBLetter) return -1;
        return a.localeCompare(b);
    }

    sortTags(tags: string[]): string[] {
        return tags.sort((a, b) => {
            if (a === '|no-tag') return 1;
            if (b === '|no-tag') return -1;
            if (a.length !== b.length) return a.length - b.length;
            return this.sortByAlphabet(a, b);
        });
    }

    sortFolder(folders: TFolder[]): TFolder[] {
        return folders.sort((a, b) => this.sortByAlphabet(a.name, b.name));
    }

    sortFile(files: TFile[]): TFile[] {
        return files.sort((a, b) => {
            if (this.isMdExtension(a) !== this.isMdExtension(b)) {
                return this.isMdExtension(a) ? -1 : 1;
            }
            if (this.isCanvaExtension(a) !== this.isCanvaExtension(b)) {
                return this.isCanvaExtension(a) ? -1 : 1;
            }
            if (a.extension !== b.extension) {
                return a.extension.localeCompare(b.extension);
            }
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
    }

    filterItems(files: TFile[], filter: Filter): TFile[] {
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

    filterFolders(folders: TFolder[], filter: Filter): TFolder[] {
        return folders.filter(folder => {
            if (filter.searchText) {
                const searchLower = filter.searchText.toLowerCase();
                return folder.name.toLowerCase().includes(searchLower);
            }
            return true;
        });
    }


}



