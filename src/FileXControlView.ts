import { ItemView, setIcon, WorkspaceLeaf, TFile, TFolder, Notice, Menu, TAbstractFile, getAllTags } from 'obsidian';
import { FileAPI } from './FileAPI';
import FileXPlugin from '../main';
import * as YAML from 'yaml';
import { FileXFilter } from './types';
import { FileXMenu } from './FileXMenu';

export const VIEW_TYPE_FILEX_CONTROL = 'filex-control';

const EXTENSIONS = {
    MD: 'md',
    CANVA: 'canva'
} as const;

const SEGMENTS = {
    VAULT: 'vault',
    FOLDER_L2: 'folder-l2',
    ALL_FILES: 'all-files',
    TAG: 'tag',
    NOT_LINK: 'not-link'
} as const;

const DOM_SELECTORS = {
    FILE_LIST_BODY: 'tbody.file-list-body',
    FOLDER_PATH_CONTAINER: '.folder-path-container',
    FILE_COUNT: '.file-count',
    TAGS_CONTAINER: '.tags-container',
    SEARCH_INPUT: '.search-input',
    SEGMENT_BUTTON: '.segment-button'
} as const;

export class FileXControlView extends ItemView {
    private fileAPI: FileAPI;
    private plugin: FileXPlugin;
    private properties: string[];
    private decent: boolean = false;
    private showAttachments: boolean = true;
    private showMd: boolean = true;
    private showFolder: boolean = true;
    private showAmount: boolean = false;
    private filter: FileXFilter = {
        segment: SEGMENTS.VAULT
    };
    private menu: FileXMenu;
    private domCache: Map<string, HTMLElement> = new Map();

    constructor(leaf: WorkspaceLeaf, plugin: FileXPlugin) {
        super(leaf);
        this.fileAPI = new FileAPI(this);
        this.plugin = plugin;
        this.menu = new FileXMenu(this);
        this.initProperties();
    }

    private initProperties() {
        this.properties = this.plugin.settings.properties ? 
            this.plugin.settings.properties.split(',') : 
            [];
    }

    private getDomElement(selector: string): HTMLElement {
        if (!this.domCache.has(selector)) {
            const element = this.contentEl.querySelector(selector);
            if (!element) {
                throw new Error(`Element not found: ${selector}`);
            }
            this.domCache.set(selector, element as HTMLElement);
        }
        return this.domCache.get(selector)!;
    }

    getViewType() {
        return VIEW_TYPE_FILEX_CONTROL;
    }


    getDisplayText() {
        return 'FileX Control';
    }


    async onOpen() {
        this.setHtml();
        this.setHtmlIcon();
        this.initListeners();
        this.segmentClickHandler(SEGMENTS.VAULT);
    }

    private initListeners() {
        this.initSegmentListeners();
        this.initOptionListeners();
        this.initSearchListener();
        this.initTableHeaders();
    }

    private initSegmentListeners() {
        const segmentButtons = this.contentEl.querySelectorAll('.segment-button');
        segmentButtons.forEach(button => {
            button.addEventListener('click', () => this.segmentClickHandler(button.id));
        });

        const rootFolderButton = this.contentEl.querySelector('.file-info-container span.filex-icon-folder');
        rootFolderButton?.addEventListener('click', () => this.segmentClickHandler(SEGMENTS.VAULT));
    }

    private initOptionListeners() {
        type OptionKey = 'sort-order' | 'show-attachments' | 'show-md' | 'show-folder' | 'show-amount';
        type OptionConfig = {
            selector: string;
            handler: () => void;
        };

        const options: Record<OptionKey, OptionConfig> = {
            'sort-order': {
                selector: '.options-row .sort-order',
                handler: () => {
                    this.decent = !this.decent;
                    this.refresh();
                }
            },
            'show-attachments': {
                selector: '.options-row .show-attachments',
                handler: () => {
                    this.showAttachments = !this.showAttachments;
                    this.refresh();
                }
            },
            'show-md': {
                selector: '.options-row .show-md',
                handler: () => {
                    this.showMd = !this.showMd;
                    this.refresh();
                }
            },
            'show-folder': {
                selector: '.options-row .show-folder',
                handler: () => {
                    this.showFolder = !this.showFolder;
                    this.refresh();
                }
            },
            'show-amount': {
                selector: '.options-row .show-amount',
                handler: () => {
                    this.showAmount = !this.showAmount;
                    this.refresh();
                }
            }
        };

        Object.values(options).forEach(({ selector, handler }) => {
            const element = this.contentEl.querySelector(selector);
            element?.addEventListener('click', handler);
        });
    }

    private initSearchListener() {
        const searchInput = this.contentEl.querySelector('.search-input') as HTMLInputElement;
        if (!searchInput) return;

        const debounce = (fn: Function, delay: number) => {
            let timeoutId: NodeJS.Timeout;
            return (...args: any[]) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn.apply(this, args), delay);
            };
        };

        const handleSearch = debounce((e: Event) => {
            this.filter.searchText = (e.target as HTMLInputElement).value;
            this.refresh();
        }, 300);

        searchInput.addEventListener('input', handleSearch);
    }

    private initTableHeaders() {
        const headerTr = this.contentEl.querySelector(".file-list-header tr");
        if (!headerTr || !this.properties.length) return;

        const headerHtml = this.properties
            .map(property => `<th>${property}</th>`)
            .join('');
        headerTr.insertAdjacentHTML('beforeend', headerHtml);
    }

    private async saveFileFrontmatter(file: TFile, map: Record<string, any>) {
        try {
            const content = await this.app.vault.read(file);
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;

            if (frontmatter) {
                Object.assign(frontmatter, map);
                const newFrontmatterStr = YAML.stringify(frontmatter);
                const newContent = content.replace(/^---\n([\s\S]*?)\n---/, `---\n${newFrontmatterStr}---`);
                await this.app.vault.modify(file, newContent);
                new Notice(`檔案 ${file.basename} 的 frontmatter 已更新`);
            } else {
                const newFrontmatter = YAML.stringify(map);
                const newContent = `---\n${newFrontmatter}---\n\n${content}`;
                await this.app.vault.modify(file, newContent);
                new Notice(`檔案 ${file.basename} 添加新的 frontmatter`);
            }
        } catch (error) {
            new Notice(`更新 frontmatter 失敗: ${error.message}`);
            console.error('Error updating frontmatter:', error);
        }
    }

    private setTrInnerHtml(tr: HTMLElement, data: TFolder | TFile, mode: 'folder' | 'file') {
        const td = tr.createEl('td');
        const a = td.createEl('a', { href: '#' });

        tr.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showFileMenu(e, data);
        });

        const createFolderRow = (a: HTMLAnchorElement, folder: TFolder) => {
            setIcon(a, 'folder');
            const nameSpan = a.createEl('span', { text: folder.name });
            
            if (this.showAmount) {
                const fileCount = this.calculateFolderFileCount(folder);
                if (fileCount > 0) {
                    nameSpan.createEl('span', {
                        text: ` (${fileCount})`,
                        cls: 'file-amount'
                    });
                }
            }

            a.addEventListener('click', () => {
                this.buildTableByTFolder(folder);
                this.buildFileInfoPath(folder.path);
            });
        }

        const createFileRow = (a: HTMLAnchorElement, file: TFile, tr: HTMLElement) => {
            a.addClass('file-link');
            setIcon(a.createEl('span', { cls: 'filex-icon filex-icon-file' }), 'file');
            a.createEl('span', { text: file.name });
            a.addEventListener('click', () => {
                // 檢查是否有已開啟的相同檔案
                const leaves = this.app.workspace.getLeavesOfType('markdown');
                const existingLeaf = leaves.find(leaf => {
                    const viewState = leaf.getViewState();
                    return viewState.state?.file === file.path;
                });

                if (existingLeaf) {
                    // 如果找到已開啟的檔案，切換到該分頁
                    this.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
                    // 如果沒有找到，開啟新分頁
                    this.app.workspace.openLinkText(file.path, '', true);
                }
            });

            if(file.extension !== 'md'){
                this.properties.forEach(() => tr.createEl('td'));
                return;
            }

            const isReadMode = this.plugin.settings.userMode === "read";
            const fileCache = this.app.metadataCache.getFileCache(file);

            this.properties.forEach(property => {
                const value = fileCache?.frontmatter?.[property];
                if (isReadMode) {
                    tr.createEl('td', { text: value });
                } else {
                    const input = tr.createEl('td').createEl('input', { value: value });
                    input.addEventListener('blur', async () => {
                        const newValue = input.value;
                        const oldValue = fileCache?.frontmatter?.[property] || '';

                        if (newValue !== oldValue) {
                            await this.saveFileFrontmatter(file, {
                                [property]: newValue
                            });
                        }
                    });;
                }
            });
        }

        if (mode === 'folder') {
            createFolderRow(a, data as TFolder);
            this.properties.forEach(() => tr.createEl('td'));
        } else {
            createFileRow(a, data as TFile, tr);
        }
    }

    private setTagHtml(target: HTMLElement, tagName: string) {
        const tagsClickHandler = () => {
            this.filter.tags = [tagName];
            this.buildTableByTFolder(this.fileAPI.getRoot()!);
            
            target.parentElement?.querySelectorAll('.multi-select-pill').forEach(pill => {
                pill.classList.remove('is-active');
            });
            tagNameEle.parentElement?.classList.add('is-active');
        }

        let tagNameEle = target.createEl('div', { cls: 'multi-select-pill' })
            .createEl('div', { cls: 'multi-select-pill-content' });
        
        tagNameEle.addEventListener('click', tagsClickHandler);
        const tagSpan = tagNameEle.createEl('span', { text: tagName });

        if (this.showAmount) {
            const tagCount = this.calculateTagFileCount(tagName);
            if (tagCount > 0) {
                tagSpan.createEl('span', {
                    text: ` (${tagCount})`,
                    cls: 'file-amount'
                });
            }
        }
    }

    private calculateFolderFileCount(folder: TFolder): number {
        let count = 0;
        folder.children.forEach(child => {
            if (child instanceof TFile) {
                const isMdOrCanva = child.extension === EXTENSIONS.MD || child.extension === EXTENSIONS.CANVA;
                if ((isMdOrCanva && this.showMd) || (!isMdOrCanva && this.showAttachments)) {
                    count++;
                }
            } else if (child instanceof TFolder) {
                count += this.calculateFolderFileCount(child);
            }
        });
        return count;
    }

    private calculateTagFileCount(tagName: string): number {
        const allFiles = this.fileAPI.getAllFiles();
        return allFiles.filter(file => {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return false;
            const fileTags = getAllTags(cache);
            return fileTags && fileTags.includes(tagName);
        }).length;
    }

    buildTableByFolderPath(folderPath: string) {
        let tFolder: TFolder = this.fileAPI.getTFolderByFolderPath(folderPath)!;
        this.buildFileInfoPath(folderPath);
        this.filter.folderPath = folderPath;
        this.buildTableByTFolder(tFolder);
    }

    buildTableByTFolder(tFolder: TFolder) {
        const tbody = this.getDomElement(DOM_SELECTORS.FILE_LIST_BODY);
        tbody.innerHTML = '';

        if (this.filter.segment === SEGMENTS.TAG) {
            this.buildTagTable(tbody);
        } else {
            this.buildFolderTable(tbody, tFolder);
        }
    }

    private buildTagTable(tbody: HTMLElement) {
        const allFiles = this.fileAPI.getAllFiles();
        const filteredFiles = this.fileAPI.filterItems(allFiles, this.filter);
        
        this.renderFileList(tbody, filteredFiles);
    }

    private buildFolderTable(tbody: HTMLElement, tFolder: TFolder) {
        const tFolderFolderList = this.fileAPI.filterFolders(
            this.fileAPI.sortFolder(tFolder.children.filter(folder => folder instanceof TFolder)),
            this.filter
        );

        const tFolderFileList = this.fileAPI.filterItems(
            this.fileAPI.sortFile(tFolder.children.filter(file => file instanceof TFile)),
            this.filter
        );

        if (this.decent) {
            tFolderFolderList.reverse();
            tFolderFileList.reverse();
        }

        if (this.showFolder) {
            tFolderFolderList.forEach(folder => {
                this.setTrInnerHtml(tbody.createEl('tr'), folder, "folder");
            });
        }

        this.renderFileList(tbody, tFolderFileList);
    }

    private renderFileList(tbody: HTMLElement, files: TFile[]) {
        files.forEach(file => {
            const isMdOrCanva = file.extension === EXTENSIONS.MD || file.extension === EXTENSIONS.CANVA;
            if ((isMdOrCanva && !this.showMd) || (!isMdOrCanva && !this.showAttachments)) {
                return;
            }
            this.setTrInnerHtml(tbody.createEl('tr'), file, "file");
        });
    }

    buildFileInfoPath(folderPath: string) {
        let folderPathContainer = this.contentEl.querySelector('.folder-path-container')!;
        let fileCountSpan = this.contentEl.querySelector('.file-count')!;
        folderPathContainer.innerHTML = '';

        // 計算檔案數量的輔助函數
        const calculateFileCount = (files: TFile[]) => {
            let totalCount = 0;
            let visibleCount = 0;

            files.forEach(file => {
                const isMdOrCanva = file.extension === EXTENSIONS.MD || file.extension === EXTENSIONS.CANVA;
                
                // 根據顯示設定計算可見檔案數
                if (isMdOrCanva && this.showMd) {
                    totalCount++;
                    if (this.fileAPI.filterItems([file], this.filter).length > 0) {
                        visibleCount++;
                    }
                } else if (!isMdOrCanva && this.showAttachments) {
                    totalCount++;
                    if (this.fileAPI.filterItems([file], this.filter).length > 0) {
                        visibleCount++;
                    }
                }
            });

            return { visibleCount, totalCount };
        };

        // 更新檔案計數
        let fileCount;
        if (this.filter.segment === SEGMENTS.TAG) {
            fileCount = calculateFileCount(this.fileAPI.getAllFiles());
        } else if (this.filter.segment === SEGMENTS.ALL_FILES) {
            fileCount = calculateFileCount(this.fileAPI.getAllFiles());
        } else {
            const currentFolder = this.fileAPI.getTFolderByFolderPath(folderPath);
            if (currentFolder) {
                fileCount = calculateFileCount(currentFolder.children.filter(child => child instanceof TFile) as TFile[]);
            } else {
                fileCount = { visibleCount: 0, totalCount: 0 };
            }
        }

        // 顯示檔案計數
        fileCountSpan.setText(`${fileCount.visibleCount} / ${fileCount.totalCount} files`);

        // 原有的路徑顯示邏輯
        if (this.filter.segment === SEGMENTS.TAG) {
            if (this.filter.tags && this.filter.tags.length > 0) {
                const tagName = this.filter.tags[0];
                folderPathContainer.createEl('span', { 
                    text: tagName,
                    cls: 'tag-path-item'
                });
            } else {
                folderPathContainer.createEl('span', { 
                    text: "Tags",
                    cls: 'tag-path-item'
                });
            }
            return;
        }

        // 原有的資料夾路徑邏輯
        folderPathContainer.createEl('span', { text: " / " });
        if (folderPath == "/") return;

        let absolutePath = "";
        folderPath.split('/').forEach(folderName => {
            absolutePath += folderName;
            let currentAbsolutePath = absolutePath;
            
            // 創建資料夾路徑項目
            const pathItem = folderPathContainer.createEl('span', { 
                text: folderName, 
                cls: 'folder-path-item' 
            });

            // 添加左鍵點擊事件
            pathItem.addEventListener('click', () => {
                this.buildTableByFolderPath(currentAbsolutePath);
            });

            // 添加右鍵選單
            pathItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const folder = this.fileAPI.getTFolderByFolderPath(currentAbsolutePath);
                if (folder) {
                    this.showFileMenu(e, folder);
                }
            });

            folderPathContainer.createEl('span', { text: " / " });
            absolutePath += "/";
        });
    }

    public refresh() {
        if (this.plugin.settings.properties != '') {
            this.properties = this.plugin.settings.properties.split(',');
        } else {
            this.properties = [];
        }

        switch (this.filter.segment) {
            case SEGMENTS.VAULT:
            case SEGMENTS.TAG:
                this.buildTableByTFolder(this.fileAPI.getRoot()!);
                break;
            case SEGMENTS.FOLDER_L2:
                this.segmentClickHandler(SEGMENTS.FOLDER_L2);
                break;
            case SEGMENTS.ALL_FILES:
                this.segmentClickHandler(SEGMENTS.ALL_FILES);
                break;
        }
    }

    segmentClickHandler(tab: string) {
        let tagsContainer: HTMLElement = this.contentEl.querySelector('.tags-container')!;
        tagsContainer.style.display = 'none';

        this.contentEl.querySelector('.segment-button.active')?.classList.remove('active');
        this.contentEl.querySelector(`#${tab}`)?.classList.add('active');

        this.filter.segment = tab as FileXFilter['segment'];

        if (tab === SEGMENTS.VAULT) {
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            this.buildTableByTFolder(this.fileAPI.getRoot()!);
            console.log('vault init');

        } else if (tab === SEGMENTS.FOLDER_L2) {
            this.showFolder = true;
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            let tFolderList: TFolder[] = this.fileAPI.sortFolder(
                this.fileAPI.getAllFoders().filter(folder => folder.path.split('/').length == 2)
            );

            let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
            tbody.innerHTML = '';
            tFolderList.forEach(Folder => {
                this.setTrInnerHtml(tbody.createEl('tr'), Folder, "folder");
            });

            console.log('folder-l2 clicked');

        } else if (tab === SEGMENTS.ALL_FILES) {
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            
            let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
            tbody.innerHTML = '';
            
            // 獲取所有檔案並過濾
            let allFiles = this.fileAPI.getAllFiles();
            let filteredFiles = this.fileAPI.filterItems(allFiles, this.filter);
            
            // 排序
            filteredFiles = this.fileAPI.sortFile(filteredFiles);
            if (this.decent) {
                filteredFiles.reverse();
            }

            // 顯示檔案
            filteredFiles.forEach(file => {
                if ((file.extension === EXTENSIONS.MD || file.extension === EXTENSIONS.CANVA) && !this.showMd) return;
                if (file.extension !== EXTENSIONS.MD && file.extension !== EXTENSIONS.CANVA && !this.showAttachments) return;
                this.setTrInnerHtml(tbody.createEl('tr'), file, "file");
            });

        } else if (tab === SEGMENTS.NOT_LINK) {
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            
            let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
            tbody.innerHTML = '';
            
            // 獲取未連結的檔案
            let unlinkedFiles = this.fileAPI.getUnlinkedFiles();
            let filteredFiles = this.fileAPI.filterItems(unlinkedFiles, this.filter);
            
            // 排序
            filteredFiles = this.fileAPI.sortFile(filteredFiles);
            if (this.decent) {
                filteredFiles.reverse();
            }

            // 顯示檔案
            filteredFiles.forEach(file => {
                if (!this.showAttachments) return;
                this.setTrInnerHtml(tbody.createEl('tr'), file, "file");
            });

        } else if (tab === SEGMENTS.TAG) {
            // 清除舊的標籤內容
            let tagContainer = tagsContainer.querySelector('.multi-select-container')!;
            tagContainer.innerHTML = '';
            
            // 重置 filter
            this.filter = {
                segment: SEGMENTS.TAG,
                tags: []
            };
            
            // 更新路徑顯示
            this.buildFileInfoPath('');
            
            // 顯示標籤容器並添加新標籤
            tagsContainer.style.display = 'block';
            let tagNameList: string[] = this.fileAPI.getAllTagNames();
            tagNameList.forEach(tagName => {
                this.setTagHtml(tagContainer as HTMLElement, tagName);
            });
            
            this.filter.searchText = '';
            (this.contentEl.querySelector('.search-input') as HTMLInputElement).value = '';
        }
    }

    private showFileMenu(e: MouseEvent, file: TAbstractFile) {
        return this.menu.showMenu(e, file);
    }

    async onClose() {
        // 清理工作
    }

    private setHtml() {
        const html = `
            <div class="filex-control-container">
                ${this.createSearchSection()}
                ${this.createWidgetSection()}
                ${this.createFileInfoSection()}
                ${this.createTagsSection()}
                ${this.createFileListSection()}
            </div>
        `;
        this.contentEl.innerHTML = html;
    }

    private createSearchSection(): string {
        return `
            <div class="search-container">
                <span class="filex-icon filex-icon-search">s</span>
                <input type="text" class="search-input" placeholder="搜尋檔案...">
            </div>
        `;
    }

    private createWidgetSection(): string {
        const segments = [
            { id: SEGMENTS.VAULT, text: 'Vault', active: true },
            { id: SEGMENTS.FOLDER_L2, text: 'Folder L2' },
            { id: SEGMENTS.ALL_FILES, text: 'All files' },
            { id: SEGMENTS.NOT_LINK, text: 'Not Linked' },
            { id: SEGMENTS.TAG, text: 'Tag' }
        ];

        const options = [
            { name: 'decend', class: 'sort-order' },
            { name: 'show atta', class: 'show-attachments', checked: true },
            { name: 'show md/canva', class: 'show-md', checked: true },
            { name: 'show folder', class: 'show-folder', checked: true },
            { name: 'show amount', class: 'show-amount', checked: false }
        ];

        return `
            <div class="widget-container">
                <div class="button-row">
                    ${segments.map(segment => `
                        <button class="segment-button${segment.active ? ' active' : ''}" id="${segment.id}">
                            ${segment.text}
                        </button>
                    `).join('')}
                </div>
                <hr/>
                <div class="options-row">
                    <div class="checkbox-group">
                        ${options.map(option => `
                            <label>
                                <input type="checkbox" class="${option.class}"${option.checked ? ' checked' : ''}>
                                ${option.name}
                            </label>
                        `).join('')}
                    </div>
                    <select class="sort-select">
                        <option value="name">按名稱排序</option>
                        <option value="created">按建立時間排序</option>
                        <option value="modified">按修改時間排序</option>
                    </select>
                </div>
            </div>
        `;
    }

    private createFileInfoSection(): string {
        return `
            <div class="file-info-container">
                <span class="folder-path">
                    <span class="filex-icon filex-icon-folder"></span>
                    <span class="folder-path-container"></span>
                </span>
                <span class="file-count"></span>
            </div>
        `;
    }

    private createTagsSection(): string {
        return `
            <div class="tags-container">
                <div class="metadata-property" tabindex="0" data-property-key="tags" data-property-type="multitext">
                    <div class="metadata-property-value">
                        <div class="multi-select-container"></div>
                    </div>
                </div>
            </div>
        `;
    }

    private createFileListSection(): string {
        return `
            <div class="file-list-container">
                <table class="file-list-table">
                    <thead class="file-list-header">
                        <tr>
                            <th>name</th>
                        </tr>
                    </thead>
                    <tbody class="file-list-body"></tbody>
                </table>
            </div>
        `;
    }

    private setHtmlIcon() {
        const icons = {
            'filex-icon-search': 'search',
            'filex-icon-folder': 'folder-minus'
        };

        Object.entries(icons).forEach(([className, iconName]) => {
            const element = this.contentEl.querySelector(`span.${className}`) as HTMLElement;
            if (element) {
                setIcon(element, iconName);
            }
        });
    }
}
