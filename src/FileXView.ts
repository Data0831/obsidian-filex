import { ItemView, setIcon, WorkspaceLeaf, TFile, TFolder, Notice, TAbstractFile } from 'obsidian';
import { FileAPI, FileAndFolder, FileAndFolderCounter } from './FileAPI';
import FileXPlugin from '../main';
import { Action, Filter, defaultFileFilter, isFolderChangeAction } from './Filter';
import { FileXMenu } from './FileXMenu';
import { FileXHtmlBuilder, SegmentKey, CheckboxKey } from './FileXHtml';
import { Debug, ROOT_FOLDER_PATH, debounce } from './Lib';

export const VIEW_TYPE_FILEX = 'filex-control';
export interface DomCache {
    contentEl: HTMLElement;
    searchContainer: HTMLElement;
    widgetContainer: HTMLElement;
    fileInfoContainer: HTMLElement;
    tagsContainer: HTMLElement;
    multiSelectContainer: HTMLElement;
    tbody: HTMLElement;
    headerTr: HTMLElement;
    folderPathContainer: HTMLElement;
    fileCount: HTMLElement;
}

export class FileXView extends ItemView {
    private fileAPI: FileAPI;
    private plugin: FileXPlugin;
    private properties: string[];
    public filter: Filter = defaultFileFilter.createNewCopy();
    private menu: FileXMenu;
    private domCache: DomCache;
    private countRunnigStatus: boolean = false;
    private totalFileCount: FileAndFolderCounter = {
        folderCount: 0,
        mdFileCount: 0,
        canvaFileCount: 0,
        attachmentFileCount: 0
    };
    private fileAndFolder: FileAndFolder;



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

    getViewType() {
        return VIEW_TYPE_FILEX;
    }

    getDisplayText() {
        return 'FileX Control';
    }

    getIcon() {
        return 'folder';
    }

    async onClose() {
        this.removeEventListeners();
    }

    public refresh(setRefresh: boolean = false) {
        this.filter.refresh = setRefresh;
        this.initProperties();
        this.buildTable();
    }

    private setHtmlAndInitDomCache() {
        this.contentEl.innerHTML = FileXHtmlBuilder.createHtml();
        this.initDomCache();

        const createHeader = () => {
            this.properties.forEach(property => {
                this.domCache.headerTr.createEl('th', { text: property, cls: 'sortable' });
            });
        }

        createHeader();
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

    private initDomCache() {
        this.domCache = {
            contentEl: this.contentEl,
            searchContainer: this.contentEl.querySelector('.search-container')!,
            widgetContainer: this.contentEl.querySelector('.widget-container')!,
            fileInfoContainer: this.contentEl.querySelector('.file-info-container')!,
            tagsContainer: this.contentEl.querySelector('.tags-container')!,
            multiSelectContainer: this.contentEl.querySelector('.multi-select-container')!,
            tbody: this.contentEl.querySelector('tbody.file-list-body')!,
            headerTr: this.contentEl.querySelector('thead.file-list-header tr')!,
            folderPathContainer: this.contentEl.querySelector('.folder-path-container')!,
            fileCount: this.contentEl.querySelector('.file-count')!
        }
    }

    async onOpen() {
        this.setHtmlAndInitDomCache();
        this.setHtmlIcon();
        this.initListeners();
        this.totalFileCount = this.fileAPI.getTotalFileCount();
        this.buildTable();
    }

    private initListeners() {
        const setSearchListener = () => {
            const handleSearch = (e: Event) => {
                const target = e.target as HTMLInputElement;
                this.filter.searchText = target.value;
                this.buildTable();
            };

            const debouncedSearch = debounce(handleSearch, 300);
            const searchInput = this.domCache.searchContainer.querySelector('input.search-input') as HTMLElement;
            this.addEventListenerWithCleanup(searchInput, 'input', debouncedSearch);
        }

        const segmentClickHandler = (segmentKey: SegmentKey) => {
            (segmentKey !== SegmentKey.Tag) ? this.domCache.tagsContainer.style.display = 'none' : (
                this.domCache.tagsContainer.style.display = 'block',
                this.buildTags()
            );
            this.domCache.widgetContainer.querySelector('.segment-button.active')?.classList.remove('active');
            this.domCache.widgetContainer.querySelector(`#${segmentKey}`)?.classList.add('active');
            this.filter.segment = segmentKey;
            this.filter.action = Action.Segment;
            this.buildTable();
        }

        const setSegmentClickHandler = () => {
            this.domCache.widgetContainer.querySelectorAll<HTMLButtonElement>("button.segment-button").forEach(button => {
                this.addEventListenerWithCleanup(button, 'click',
                    () => segmentClickHandler(button.id as SegmentKey));
            });
        }

        const checkBoxClickHandler = (checkboxKey: CheckboxKey) => {
            this.filter.toggleCheckbox(checkboxKey);
            this.filter.action = Action.Show;
            (checkboxKey === CheckboxKey.ShowAmount && this.filter.showAmount && this.filter.action === Action.Show) ? this.buildTags() : this.buildTags() ;
            this.buildTable();
        }

        const setCheckBoxClickHandler = () => {
            this.domCache.widgetContainer.querySelectorAll<HTMLInputElement>("input.option-checkbox").forEach(checkbox => {
                this.addEventListenerWithCleanup(checkbox, 'click',
                    () => checkBoxClickHandler(checkbox.id as CheckboxKey));
            });
        }

        const setRootFolderClickHandler = () => {
            const folderIcon = this.domCache.fileInfoContainer.querySelector('span.filex-icon-folder')!;
            this.addEventListenerWithCleanup(folderIcon as HTMLElement, 'click',
                () => segmentClickHandler(SegmentKey.Vault));
            this.addEventListenerWithCleanup(folderIcon as HTMLElement, 'contextmenu',
                (e) => this.showFileMenuByPath(e as MouseEvent, ROOT_FOLDER_PATH));
        }

        const headerClickHandler = (th: HTMLElement) => {
            this.contentEl.querySelectorAll('th.sortable').forEach(th => {
                th.removeClass('sort-asc', 'sort-desc');
            });
            this.filter.action = Action.Sort;
            this.filter.toggleSortOrder(th.textContent!);
            th.addClass(this.filter.sortAccending ? 'sort-asc' : 'sort-desc');
            this.buildTable();
        }

        const setHeaderClickHandler = () => {
            this.domCache.headerTr.querySelectorAll<HTMLTableCellElement>('th.sortable')!.forEach(th => {
                this.addEventListenerWithCleanup(th, 'click',
                    () => headerClickHandler(th));
            });
        }

        const setCollapseListeners = () => {
            const widgetCollapseBtn = this.contentEl.querySelector<HTMLElement>('.widget-container .collapse-button');
            const widgetContent = this.contentEl.querySelector<HTMLElement>('.widget-container .widget-content');
            if (widgetCollapseBtn && widgetContent) {
                this.addEventListenerWithCleanup(widgetCollapseBtn, 'click', () => {
                    widgetContent.classList.toggle('collapsed');
                    widgetCollapseBtn.classList.toggle('collapsed');
                });
            }

            const tagsCollapseBtn = this.contentEl.querySelector<HTMLElement>('.tags-container .collapse-button');
            const tagsContent = this.contentEl.querySelector<HTMLElement>('.tags-container .tags-content');
            if (tagsCollapseBtn && tagsContent) {
                this.addEventListenerWithCleanup(tagsCollapseBtn, 'click', () => {
                    tagsContent.classList.toggle('collapsed');
                    tagsCollapseBtn.classList.toggle('collapsed');
                });
            }
        }

        const setTagClickListener = () => {
            this.addEventListenerWithCleanup(this.domCache.tagsContainer, 'click', (event: MouseEvent) => {
                if (event.target instanceof HTMLElement) {
                    const tagSpan = event.target.closest('.tag-span');
                    if (tagSpan instanceof HTMLElement) {
                        this.filter.tags = [tagSpan.textContent!];
                        this.buildTable();

                        const multiSelectContainer = this.domCache.multiSelectContainer;
                        multiSelectContainer.parentElement?.querySelectorAll('.multi-select-pill').forEach(pill => {
                            pill.classList.remove('is-active');
                        });
                        tagSpan.closest('.multi-select-pill')?.classList.add('is-active');
                    }
                }
                Debug.log("click fail", event.target);
            });
        }

        setSearchListener();
        setSegmentClickHandler();
        setCheckBoxClickHandler();
        setRootFolderClickHandler();
        setHeaderClickHandler();
        setCollapseListeners();
        setTagClickListener();
    }

    private eventListeners: Array<{ element: HTMLElement, event: string, handler: EventListener }> = [];

    private addEventListenerWithCleanup(element: HTMLElement, event: string, handler: EventListener) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    private removeEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];
    }

    private showFileMenuByPath(e: MouseEvent, path: string) {
        const file = this.fileAPI.getTFolderByPath(path);
        if (file) {
            return this.menu.showMenu(e, file);
        }
    }
        
    private showFileMenu(e: MouseEvent, file: TAbstractFile) {
        return this.menu.showMenu(e, file);
    }

    private buildTags() {
        const multiSelectContainer = this.domCache.multiSelectContainer;
        multiSelectContainer.innerHTML = '';

        this.fileAPI.getAllTagNames().forEach(tagName => {
            const tagSpan = multiSelectContainer.createEl('div', { cls: 'multi-select-pill tag-span' })
                .createEl('div', { cls: 'multi-select-pill-content' });
            tagSpan.createEl('span', { text: tagName });

            if (this.filter.showAmount) {
                tagSpan.createEl('span', { text: `(${this.fileAPI.getTagFileCount(tagName)})` });
            }
        });
    }

    private buildTable() {
        const createFileRow = (tr: HTMLElement, file: TFile) => {
            const a = tr.createEl('td').createEl('a', { href: '#', cls: 'file-link' });
            setIcon(a, 'file');
            a.createEl('span', { text: file.name });
            
            tr.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFileMenu(e, file);
            });

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

            if (!this.fileAPI.isMdExtension(file)) {
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
                            await this.fileAPI.saveFileFrontmatter(file, {
                                [property]: newValue
                            });
                        }
                    });;
                }
            });
        }

        const createFolderRow = (tr: HTMLElement, folder: TFolder) => {
            const a = tr.createEl('td').createEl('a', { href: '#', cls: 'folder-link' });
            setIcon(a, 'folder');
            const nameSpan = a.createEl('span', { text: folder.name });

            tr.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showFileMenu(e, folder);
            });

            if (this.filter.showAmount) {
                const fileAndFolderCounter: FileAndFolderCounter = this.fileAPI.calculateFileCountInFolder(folder);
                const fileCount = fileAndFolderCounter.mdFileCount + fileAndFolderCounter.canvaFileCount + fileAndFolderCounter.attachmentFileCount;
                if (fileCount > 0) {
                    nameSpan.createEl('span', {
                        text: ` (${fileCount})`,
                        cls: 'file-amount'
                    });
                }
            }

            a.addEventListener('click', () => {
                this.filter.folderPath = folder.path;
                this.filter.action = Action.Folder;
                this.buildTable();
            });
            this.properties.forEach(() => tr.createEl('td'));
        }
        const fragment = document.createDocumentFragment();
        this.fileAndFolder = this.fileAPI.getFileAndFolderByFilter(this.filter);

        this.fileAndFolder.folders.forEach(folder => {
            const tr = document.createElement('tr');
            createFolderRow(tr, folder);
            fragment.appendChild(tr);
        });

        this.fileAndFolder.files.forEach(file => {
            const tr = document.createElement('tr');
            createFileRow(tr, file);
            fragment.appendChild(tr);
        });

        this.buildInfo();
        this.domCache.tbody.innerHTML = '';
        this.domCache.tbody.appendChild(fragment);
    }

    buildInfo() {
        const debouncedGetTotalFileCount = debounce(() => {
            this.countRunnigStatus = false;
            console.log("b", this.countRunnigStatus);
        }, 300000);

        if (!this.countRunnigStatus) {
            this.countRunnigStatus = true;
            debouncedGetTotalFileCount();
        }


        const fileCountSpan = this.domCache.fileCount;
        fileCountSpan.innerHTML = '';
        let fileCount = 0;
        let visibleCount = this.fileAndFolder.files.length;
        (this.filter.showMdAndCanvas) ? fileCount += this.totalFileCount.mdFileCount + this.totalFileCount.canvaFileCount : null;
        (this.filter.showAttachment) ? fileCount += this.totalFileCount.attachmentFileCount : null;
        fileCountSpan.setText(`${visibleCount} / ${fileCount} files`);

        if (isFolderChangeAction(this.filter.action)) {
            const folderPathContainer = this.domCache.folderPathContainer;
            if (this.filter.action === Action.Folder || this.filter.segment === SegmentKey.Vault) {
                folderPathContainer.innerHTML = '';
                folderPathContainer.createEl('span', { text: " / " });
                if (this.filter.folderPath == ROOT_FOLDER_PATH) return;

                let absolutePath = "";
                this.filter.folderPath.split(ROOT_FOLDER_PATH).forEach(folderName => {
                    absolutePath += folderName;
                    let currentAbsolutePath = absolutePath;

                    const pathItem = folderPathContainer.createEl('span', {
                        text: folderName,
                        cls: 'folder-path-item'
                    });

                    pathItem.addEventListener('click', () => {
                        this.filter.folderPath = currentAbsolutePath;
                        this.filter.action = Action.Folder;
                        this.buildTable();
                    });

                    pathItem.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        const folder = this.fileAPI.getTFolderByPath(currentAbsolutePath);
                        if (folder) {
                            this.showFileMenu(e, folder);
                        }
                    });

                    folderPathContainer.createEl('span', { text: " / " });
                    absolutePath += "/";
                });
            } else if (this.filter.segment === SegmentKey.Tag) {
                folderPathContainer.innerHTML = '';
                if (this.filter.tags && this.filter.tags.length > 0) {
                    const tagName = this.filter.tags[0];
                    folderPathContainer.createEl('span', {
                        text: tagName,
                        cls: 'tag-path-item'
                    });
                } else {
                    folderPathContainer.createEl('span', {
                        text: "#Tags",
                        cls: 'tag-path-item'
                    });
                }
                return;
            }

        }


    }
}