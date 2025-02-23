import { ItemView, setIcon, WorkspaceLeaf, TFile, TFolder, Notice, TAbstractFile } from 'obsidian';
import { TabstractFileMapHandler } from './TabstractFileMapHandler';
import FileXPlugin from '../main';
import { Filter } from './Filter';
import { FileXMenu } from './FileXMenu';
import { FileXHtmlBuilder } from './FileXHtml';
import { TabstractFileMap, FileAPI } from './FileAPI';
import { Debug, ROOT_FOLDER_PATH, debounce, Action, ActionFunc, Segment, Checkbox, DomCache, VIEW_TYPE_FILEX, VIEW_NAME_FILEX } from './Lib';



export class FileXView extends ItemView {
    private tabstractFileMapHandler: TabstractFileMapHandler;
    private plugin: FileXPlugin;
    private properties: string[];
    private menu: FileXMenu;
    private domCache: DomCache;
    private countRunnigStatus: boolean = false;
    private result: TabstractFileMap;
    private vaultFileCount: number;
    public filter: Filter = Filter.DefaultFilter();
    
    constructor(leaf: WorkspaceLeaf, plugin: FileXPlugin) {
        super(leaf);
        this.tabstractFileMapHandler = TabstractFileMapHandler.getInstance(this.app);
        this.plugin = plugin;
        this.menu = new FileXMenu(this);
        this.vaultFileCount = TabstractFileMapHandler.calculateVaultFileCount(this.app);
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
        return VIEW_NAME_FILEX;
    }

    getIcon() {
        return 'folder';
    }

    async onClose() {
        this.removeEventListeners();
    }

    public propertyUpdate(){
        this.initProperties();
        this.buildTable();
    }

    public refresh(setRefresh: boolean = false) {
        (setRefresh) ? this.filter.action = Action.Refresh : null;
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

        const segmentClickHandler = (segment: Segment) => {
            (segment !== Segment.Tag) ? this.domCache.tagsContainer.style.display = 'none' : (
                this.domCache.tagsContainer.style.display = 'block',
                this.buildTags()
            );
            this.domCache.widgetContainer.querySelector('.segment-button.active')?.classList.remove('active');
            this.domCache.widgetContainer.querySelector(`#${segment}`)?.classList.add('active');
            this.filter.segment = segment;
            this.filter.action = Action.Segment;
            this.buildTable();
        }

        const setSegmentClickHandler = () => {
            this.domCache.widgetContainer.querySelectorAll<HTMLButtonElement>("button.segment-button").forEach(button => {
                this.addEventListenerWithCleanup(button, 'click',
                    () => segmentClickHandler(button.id as Segment));
            });
        }

        const checkBoxClickHandler = (checkboxKey: Checkbox) => {
            this.filter.toggleCheckbox(checkboxKey);
            this.filter.action = Action.Show;
            (checkboxKey === Checkbox.ShowAmount && this.filter.showAmount && this.filter.action === Action.Show) ? this.buildTags() : this.buildTags();
            this.buildTable();
        }

        const setCheckBoxClickHandler = () => {
            this.domCache.widgetContainer.querySelectorAll<HTMLInputElement>("input.option-checkbox").forEach(checkbox => {
                this.addEventListenerWithCleanup(checkbox, 'click',
                    () => checkBoxClickHandler(checkbox.id as Checkbox));
            });
        }

        const setRootFolderClickHandler = () => {
            const folderIcon = this.domCache.fileInfoContainer.querySelector('span.filex-icon-folder')!;
            this.addEventListenerWithCleanup(folderIcon as HTMLElement, 'click',
                () => segmentClickHandler(Segment.Vault));
            this.addEventListenerWithCleanup(folderIcon as HTMLElement, 'contextmenu',
                (e) => this.showFileMenuByPath(e as MouseEvent, ROOT_FOLDER_PATH));
        }

        const headerClickHandler = (th: HTMLElement) => {
            this.contentEl.querySelectorAll('th.sortable').forEach(th => {
                th.removeClass('sort-asc', 'sort-desc');
            });
            this.filter.action = Action.Sort;
            this.filter.togglePropertyOrder(th.textContent!);
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
                        this.filter.tags = new Set([tagSpan.textContent!]);
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
        const folder = this.app.vault.getFolderByPath(path);
        if (folder) {
            return this.menu.showMenu(e, folder);
        }
    }

    private showFileMenu(e: MouseEvent, file: TAbstractFile) {
        return this.menu.showMenu(e, file);
    }

    private buildTags() {
        const multiSelectContainer = this.domCache.multiSelectContainer;
        multiSelectContainer.innerHTML = '';

        this.tabstractFileMapHandler.getAllTagNames(this.app).forEach(tagName => {
            const tagSpan = multiSelectContainer.createEl('div', { cls: 'multi-select-pill tag-span' })
                .createEl('div', { cls: 'multi-select-pill-content' });
            tagSpan.createEl('span', { text: tagName });

            if (this.filter.showAmount) {
                tagSpan.createEl('span', { text: `(${this.tabstractFileMapHandler.getTagFileCount(tagName)})` });
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

            if (!FileAPI.isMdExtension(file)) {
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
                            await TabstractFileMapHandler.saveFileFrontmatter(this.app, file, {
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
                const fileCount: number = TabstractFileMapHandler.calculateFolderFileCount(folder);
                if (fileCount > 0) {
                    nameSpan.createEl('span', {
                        text: ` (${fileCount})`,
                        cls: 'file-amount'
                    });
                }
            }

            a.addEventListener('click', () => {
                this.filter.path = folder.path;
                this.filter.action = Action.Folder;
                this.buildTable();
            });
            this.properties.forEach(() => tr.createEl('td'));
        }
        const fragment = document.createDocumentFragment();
        this.result = this.tabstractFileMapHandler.queryByFilter(this.filter);

        this.result.folders.forEach((folder: TFolder) => {
            const tr = document.createElement('tr');
            createFolderRow(tr, folder);
            fragment.appendChild(tr);
        });

        this.result.files.forEach((file: TFile) => {
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
        fileCountSpan.setText(`${this.result.files.length} / ${this.vaultFileCount} files`);

        if (ActionFunc.isFolderPathNeedUpdate(this.filter.action)) {
            const folderPathContainer = this.domCache.folderPathContainer;
            if (this.filter.action === Action.Folder || this.filter.segment === Segment.Vault) {
                folderPathContainer.innerHTML = '';
                folderPathContainer.createEl('span', { text: " / " });
                if (this.filter.path == ROOT_FOLDER_PATH) return;

                let absolutePath = "";
                this.filter.path.split(ROOT_FOLDER_PATH).forEach(folderName => {
                    absolutePath += folderName;
                    let currentAbsolutePath = absolutePath;

                    const pathItem = folderPathContainer.createEl('span', {
                        text: folderName,
                        cls: 'folder-path-item'
                    });

                    pathItem.addEventListener('click', () => {
                        this.filter.path = currentAbsolutePath;
                        this.filter.action = Action.Folder;
                        this.buildTable();
                    });

                    pathItem.addEventListener('contextmenu', (e) => {
                        e.preventDefault();
                        const folder = this.app.vault.getFolderByPath(currentAbsolutePath);
                        if (folder) {
                            this.showFileMenu(e, folder);
                        }
                    });

                    folderPathContainer.createEl('span', { text: " / " });
                    absolutePath += "/";
                });
            } else if (this.filter.segment === Segment.Tag) {
                folderPathContainer.innerHTML = '';
                if (this.filter.tags && this.filter.tags.size > 0) {
                    const tagName = Array.from(this.filter.tags)[0];
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