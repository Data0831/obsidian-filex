import { Notice, TFile, TFolder, getAllTags, App } from 'obsidian';
import { Filter } from './Filter';
import * as YAML from 'yaml';
import { Debug, NO_TAG, Action, ActionFunc, Segment, Command, DEFAULT_FILTER_VALUE } from './Lib';
import { TabstractFileMap, FileAPI } from './FileAPI';

class TabstractFileHandler {
    protected tagMap: Record<string, TFile[]> = {};
    protected generateTagMap(app: App) {
        this.tagMap = {};
        app.vault.getMarkdownFiles().forEach(file => {
            const cache = app.metadataCache.getFileCache(file);
            if (cache) {
                const tags = getAllTags(cache);
                if (tags) {
                    for (const tag of tags) {
                        this.tagMap[tag] = this.tagMap[tag] || [];
                        this.tagMap[tag].push(file);
                    }
                } else {
                    this.tagMap[NO_TAG].push(file);
                }
            }
        });
    }

    public getAllTagNames(app: App): string[] {
        this.generateTagMap(app);
        return FileAPI.sortTags(Object.keys(this.tagMap));
    }

    public getTagFileCount(tagName: string): number {
        return this.tagMap[tagName]?.length || 0;
    }

    public static calculateFolderFileCount(folder: TFolder): number {
        let count = 0;
        folder.children.forEach((child: TFile) => {
            count++;
        });
        return count;
    }

    public static calculateVaultFileCount(app: App): number {
        return app.vault.getFiles().length;
    }

    public static getUnlinkedFiles(app: App): TFile[] {
        const allLinks = new Set<string>();
        app.vault.getMarkdownFiles().forEach(mdFile => {
            const cache = app.metadataCache.getFileCache(mdFile);
            if (cache) {
                cache.embeds?.forEach(embed => allLinks.add(embed.link));
                cache.links?.forEach(link => allLinks.add(link.link));
            }
        });

        Debug.log("allLinks", allLinks);
        return app.vault.getFiles().filter(file =>
            !FileAPI.isObExtension(file) &&
            !Array.from(allLinks).some(link =>
                link.includes(file.basename) || link.includes(file.path)
            )
        );
    }

    public static async saveFileFrontmatter(app: App, file: TFile, map: Record<string, any>) {
        try {
            const content = await app.vault.read(file);
            const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;

            if (frontmatter) {
                Object.assign(frontmatter, map);
                const newFrontmatterStr = YAML.stringify(frontmatter);
                const newContent = content.replace(/^---\n([\s\S]*?)\n---/, `---\n${newFrontmatterStr}---`);
                await app.vault.modify(file, newContent);
                new Notice(`檔案 ${file.basename} 的 frontmatter 已更新`);
            } else {
                const newFrontmatter = YAML.stringify(map);
                const newContent = `---\n${newFrontmatter}---\n\n${content}`;
                await app.vault.modify(file, newContent);
                new Notice(`檔案 ${file.basename} 添加新的 frontmatter`);
            }
        } catch (error) {
            new Notice(`更新 frontmatter 失敗: ${error.message}`);
            console.error('Error updating frontmatter:', error);
        }
    }
}

export class TabstractFileMapHandler extends TabstractFileHandler {
    private prevFileter: Filter = Filter.UndefinedFilter();
    private fileMap: TabstractFileMap = { files: [], folders: [] };
    private static _instance: TabstractFileMapHandler;
    public static getInstance(app: App): TabstractFileMapHandler {
        if (!TabstractFileMapHandler._instance) {
            TabstractFileMapHandler._instance = new TabstractFileMapHandler(app);
        }
        return TabstractFileMapHandler._instance;
    }

    private constructor(private app: App) {
        super();
        if (TabstractFileMapHandler._instance) {
            throw new Error("TabstractFileMapHandler is a singleton class and cannot be instantiated directly.");
        }
    }

    public queryByFilter(filter: Filter): TabstractFileMap {
        Debug.log(filter);
        if (ActionFunc.isFileMapNeedUpdate(filter.action)) {
            this.fileMap.files = [];
            this.fileMap.folders = [];
            switch (filter.action) {
                case Action.Refresh:
                    filter.action = this.prevFileter.action;
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
                    this.handleTagAction(filter);
                    break;
                case Action.Command:
                    this.handleCommandAction(filter);
                    break;
            }
        }
        this.prevFileter.copyValueFrom(filter);
        const result: TabstractFileMap = {
            files: [],
            folders: filter.showFolder ? FileAPI.sortFolder(this.fileMap.folders) : []
        };

        result.files = this.fileMap.files.filter(file =>
            (filter.showMdAndCanvas && FileAPI.isObExtension(file)) ||
            (filter.showAttachment && !FileAPI.isObExtension(file))
        );

        if (filter.property === DEFAULT_FILTER_VALUE.property) {
            result.files = FileAPI.sortFile(result.files);
        } else {
            result.files = FileAPI.sortFileByProperty(result.files, filter.property, this.app);
        }

        if (!filter.sortAccending) {
            result.folders = result.folders.reverse();
            result.files = result.files.reverse();
        }

        return result;
    }

    private handleSearchAction(filter: Filter) {
        // todo: 之後可能設定可以在 某資料夾內搜索、deep search、field 等等
        const searchText = filter.searchText.toLowerCase();
        this.fileMap.files = this.app.vault.getFiles()
            .filter(file => file.name.toLowerCase().includes(searchText));
        this.fileMap.folders = this.app.vault.getAllFolders()
            .filter(folder => folder.name.toLowerCase().includes(searchText));
    }

    public handleSegmentAction(filter: Filter) {
        switch (filter.segment) {
            case Segment.Vault:
                const rootFolder = this.app.vault.getRoot();
                this.fileMap.folders = rootFolder.children.filter(folder => folder instanceof TFolder) as TFolder[];
                this.fileMap.files = rootFolder.children.filter(file => file instanceof TFile) as TFile[];
                break;
            case Segment.FolderL2:
                this.fileMap.folders = this.app.vault.getAllFolders()
                    .filter(folder => folder.path.split('/').length == 2);
                break;
            case Segment.AllFiles:
                this.fileMap.files = this.app.vault.getFiles();
                break;
            case Segment.UnLinked:
                this.fileMap.files = TabstractFileMapHandler.getUnlinkedFiles(this.app);
                break;
            case Segment.Tag:
                // 點擊 tag 後，不需要生成或更改 fileMap
                break;
        }
    }

    public handleFolderAction(filter: Filter) {
        const folder = this.app.vault.getFolderByPath(filter.path!);
        if (folder) {
            this.fileMap.files = folder.children.filter(file => file instanceof TFile) as TFile[];
            this.fileMap.folders = folder.children.filter(folder => folder instanceof TFolder) as TFolder[];
        }
    }

    public handleTagAction(filter: Filter) {
        this.fileMap.files = this.tagMap[Array.from(filter.tags)[0]];
    }

    public handleCommandAction(filter: Filter) {
        // todo: 之後做設定
        switch (filter.command) {
            case Command.GenLink:
                this.handleGenLinkAction(filter);
                break;
        }
    }

    private handleGenLinkAction(filter: Filter) {
        this.generateTagMap(this.app);
        this.handleTagAction(filter);
    }
}