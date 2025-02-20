import { ItemView, setIcon, WorkspaceLeaf, TFile, TFolder, Notice, TAbstractFile, getAllTags, App  } from 'obsidian';
import { FileAPI } from './FileAPI';
import FileXPlugin from '../main';
import * as YAML from 'yaml';
import { FileXFilter } from './types';
import { FileXMenu } from './FileXMenu';

export const VIEW_TYPE_FILEX_CONTROL = 'filex-control';

const SEGMENTS = {
    VAULT: 'vault',
    FOLDER_L2: 'folder-l2',
    ALL_FILES: 'all-files',
    TAG: 'tag',
    NOT_LINK: 'not-link'
} as const;

export class FileXControlView extends ItemView {
    private fileAPI: FileAPI;
    private plugin: FileXPlugin;
    private properties: string[];
    private sortConfig: {
        column: string;
        isDescending: boolean;
    } = {
        column: 'name',
        isDescending: false
    };
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

    getIcon() {
        return 'folder';
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
        this.initCollapseListeners();
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
        type OptionKey = 'show-attachments' | 'show-md' | 'show-folder' | 'show-amount';
        type OptionConfig = {
            selector: string;
            handler: () => void;
        };

        const options: Record<OptionKey, OptionConfig> = {
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
        if (!headerTr) return;

        const nameHeader = headerTr.querySelector('th');
        if (nameHeader) {
            nameHeader.addClass('sortable');
            this.addSortListener(nameHeader, 'name');
        }

        if (this.properties.length) {
            const headerHtml = this.properties
                .map(property => `<th class="sortable">${property}</th>`)
                .join('');
            headerTr.insertAdjacentHTML('beforeend', headerHtml);

            headerTr.querySelectorAll('th.sortable').forEach(th => {
                if (th !== nameHeader) {
                    this.addSortListener(th as HTMLElement, th.textContent || '');
                }
            });
        }
    }

    private addSortListener(th: HTMLElement, column: string) {
        th.addEventListener('click', () => {
            this.contentEl.querySelectorAll('th.sortable').forEach(header => {
                header.removeClass('sort-asc', 'sort-desc');
            });

            if (this.sortConfig.column === column) {
                this.sortConfig.isDescending = !this.sortConfig.isDescending;
            } else {
                this.sortConfig.column = column;
                this.sortConfig.isDescending = false;
            }

            th.addClass(this.sortConfig.isDescending ? 'sort-desc' : 'sort-asc');

            this.refresh();
        });
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
                const leaves = this.app.workspace.getLeavesOfType('markdown');
                const existingLeaf = leaves.find(leaf => {
                    const viewState = leaf.getViewState();
                    return viewState.state?.file === file.path;
                });

                if (existingLeaf) {
                    this.app.workspace.setActiveLeaf(existingLeaf, { focus: true });
                } else {
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
                const isMdOrCanva = this.fileAPI.isObsidianExtension(child.extension);
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
        const tbody = this.getDomElement("tbody.file-list-body");
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

        if (this.sortConfig.isDescending) {
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
            const isMdOrCanva = this.fileAPI.isObsidianExtension(file.extension);
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

        const calculateFileCount = (files: TFile[]) => {
            let totalCount = 0;
            let visibleCount = 0;

            files.forEach(file => {
                const isMdOrCanva = this.fileAPI.isObsidianExtension(file.extension);
                
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

        fileCountSpan.setText(`${fileCount.visibleCount} / ${fileCount.totalCount} files`);

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

        folderPathContainer.createEl('span', { text: " / " });
        if (folderPath == "/") return;

        let absolutePath = "";
        folderPath.split('/').forEach(folderName => {
            absolutePath += folderName;
            let currentAbsolutePath = absolutePath;
            
            const pathItem = folderPathContainer.createEl('span', { 
                text: folderName, 
                cls: 'folder-path-item' 
            });

            pathItem.addEventListener('click', () => {
                this.buildTableByFolderPath(currentAbsolutePath);
            });

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
            
            let allFiles = this.fileAPI.getAllFiles();
            let filteredFiles = this.fileAPI.filterItems(allFiles, this.filter);
            
            filteredFiles = this.fileAPI.sortFile(filteredFiles);
            if (this.sortConfig.isDescending) {
                filteredFiles.reverse();
            }

            filteredFiles.forEach(file => {
                if ((this.fileAPI.isObsidianExtension(file.extension)) && !this.showMd) return;
                if (!this.fileAPI.isObsidianExtension(file.extension) && !this.showAttachments) return;
                this.setTrInnerHtml(tbody.createEl('tr'), file, "file");
            });

        } else if (tab === SEGMENTS.NOT_LINK) {
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            
            let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
            tbody.innerHTML = '';
            
            let unlinkedFiles = this.fileAPI.getUnlinkedFiles();
            let filteredFiles = this.fileAPI.filterItems(unlinkedFiles, this.filter);
            
            filteredFiles = this.fileAPI.sortFile(filteredFiles);
            if (this.sortConfig.isDescending) {
                filteredFiles.reverse();
            }

            filteredFiles.forEach(file => {
                if (!this.showAttachments) return;
                this.setTrInnerHtml(tbody.createEl('tr'), file, "file");
            });

        } else if (tab === SEGMENTS.TAG) {
            let tagContainer = tagsContainer.querySelector('.multi-select-container')!;
            tagContainer.innerHTML = '';
            
            this.filter = {
                segment: SEGMENTS.TAG,
                tags: []
            };
            
            this.buildFileInfoPath('');
            
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
            { name: 'show atta', class: 'show-attachments', checked: true },
            { name: 'show md/canva', class: 'show-md', checked: true },
            { name: 'show folder', class: 'show-folder', checked: true },
            { name: 'show amount', class: 'show-amount', checked: false }
        ];

        return `
            <div class="widget-container">
                <div class="widget-header">
                    <div class="collapse-button">
                        <span class="collapse-icon"></span>
                    </div>
                </div>
                <div class="widget-content">
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
                    </div>
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
                <div class="tags-header">
                    <div class="collapse-button">
                        <span class="collapse-icon"></span>
                    </div>
                </div>
                <div class="tags-content">
                    <div class="metadata-property" tabindex="0" data-property-key="tags" data-property-type="multitext">
                        <div class="metadata-property-value">
                            <div class="multi-select-container"></div>
                        </div>
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

    static handleBreadcrumbClick(app: App, path: string) {
        const leaves = app.workspace.getLeavesOfType(VIEW_TYPE_FILEX_CONTROL);
        if (leaves.length > 0) {
            const view = leaves[0].view as FileXControlView;
            view.buildTableByFolderPath(path);
            app.workspace.revealLeaf(leaves[0]);
        }
    }

    private initCollapseListeners() {
        const widgetCollapseBtn = this.contentEl.querySelector('.widget-container .collapse-button');
        const widgetContent = this.contentEl.querySelector('.widget-container .widget-content');
        if (widgetCollapseBtn && widgetContent) {
            widgetCollapseBtn.addEventListener('click', () => {
                widgetContent.classList.toggle('collapsed');
                widgetCollapseBtn.classList.toggle('collapsed');
            });
        }

        const tagsCollapseBtn = this.contentEl.querySelector('.tags-container .collapse-button');
        const tagsContent = this.contentEl.querySelector('.tags-container .tags-content');
        if (tagsCollapseBtn && tagsContent) {
            tagsCollapseBtn.addEventListener('click', () => {
                tagsContent.classList.toggle('collapsed');
                tagsCollapseBtn.classList.toggle('collapsed');
            });
        }
    }
}

export function initBreadcrumbListener(app: App) {
    const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target && target.matches('.view-header-breadcrumb')) {
            const breadcrumbs = Array.from(target.closest('.view-header-title-parent')?.querySelectorAll('.view-header-breadcrumb') || []);
            const currentIndex = breadcrumbs.indexOf(target);
            
            if (currentIndex !== -1) {
                const fullPath = breadcrumbs
                    .slice(0, currentIndex + 1)
                    .map(el => el.textContent)
                    .filter(text => text)
                    .join('/');
                
                FileXControlView.handleBreadcrumbClick(app, fullPath);
            }
        }
    };

    document.addEventListener('click', handleClick, true);
}
