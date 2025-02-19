import { ItemView, setIcon, WorkspaceLeaf, TFile, TFolder, Notice } from 'obsidian';
import { FileAPI } from './FileAPI';
import FileXPlugin from '../main';
import * as YAML from 'yaml';

export const VIEW_TYPE_FILEX_CONTROL = 'filex-control';

export class FileXControlView extends ItemView {
    fileAPI: FileAPI;
    plugin: FileXPlugin;
    properties: string[];
    decent:boolean = false;
    showAttachments:boolean = true;
    showMd:boolean = true;
    showFolder:boolean = true;
    status: { type: string; folderPath?: string };

    constructor(leaf: WorkspaceLeaf, plugin: FileXPlugin) {
        super(leaf);
        this.fileAPI = new FileAPI(this);
        this.plugin = plugin;

        if (plugin.settings.properties != '') {
            this.properties = plugin.settings.properties.split(',');
        } else {
            this.properties = [];
        }
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
        this.segmentClickHandler('vault');
    }

    private initListeners() {
        const setsegmentClickListener = () => {
            this.contentEl.querySelectorAll('.segment-button').forEach(button => {
                button.addEventListener('click', () => this.segmentClickHandler(button.id));
            });
        }

        const initTableTh = () => {
            const headerTr = this.contentEl.querySelector(".file-list-header tr");
            if (headerTr) {
                headerTr.innerHTML += this.properties
                    .map(property => `<th>${property}</th>`)
                    .join('');
            }
        }

        const setRootFolderButtonClickListener = () => {
            this.contentEl.querySelector('.file-info-container span.filex-icon-folder')
                ?.addEventListener('click', () => this.segmentClickHandler('vault'));
        }

        const setSortOrderClickListener = () => {
            this.contentEl.querySelector('.options-row .sort-order')?.addEventListener('click', () => {
                this.decent = !this.decent;
                this.refresh();
            });
        }

        const setShowAttachmentsClickListener = () => {
            this.contentEl.querySelector('.options-row .show-attachments')?.addEventListener('click', () => {
                this.showAttachments = !this.showAttachments;
                console.log('showAttachments', this.showAttachments);
                this.refresh();
            });
        }

        const setShowMdClickListener = () => {
            this.contentEl.querySelector('.options-row .show-md')?.addEventListener('click', () => {
                this.showMd = !this.showMd;
                console.log('showMd', this.showMd);
                this.refresh();
            });
        }

        const setShowFolderClickListener = () => {
            this.contentEl.querySelector('.options-row .show-folder')?.addEventListener('click', () => {
                this.showFolder = !this.showFolder;
                console.log('showFolder', this.showFolder);
                this.refresh();
            });
        }

        setsegmentClickListener();
        setRootFolderButtonClickListener();
        setSortOrderClickListener();
        setShowAttachmentsClickListener();
        setShowMdClickListener();
        setShowFolderClickListener();
        initTableTh();
    }

    private async saveFileFrontmatter(file: TFile, map: Record<string, any>) {
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
    }

    private setTrInnerHtml(tr: HTMLElement, data: TFolder | TFile, mode: 'folder' | 'file') {
        const td = tr.createEl('td');
        const a = td.createEl('a', { href: '#' });

        const createFolderRow = (a: HTMLAnchorElement, folder: TFolder) => {
            setIcon(a, 'folder');
            a.createEl('span', { text: folder.name });
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
                this.app.workspace.openLinkText(file.path, '', true);
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

    setTagHtml(target: HTMLElement, tagName: string) {
        let tagNameEle = target.createEl('div', { cls: 'multi-select-pill' }).createEl('div', { cls: 'multi-select-pill-content' })
        tagNameEle.createEl('span', { text: tagName })
    }

    buildTableByFolderPath(folderPath: string) {
        let tFolder: TFolder = this.fileAPI.getTFolderByFolderPath(folderPath)!;
        this.buildFileInfoPath(folderPath);
        this.buildTableByTFolder(tFolder);
    }

    buildTableByTFolder(tFolder: TFolder) {
        let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
        tbody.innerHTML = '';
        let tFolderFolderList = this.fileAPI.sortFolder(tFolder.children.filter(folder => folder instanceof TFolder));
        let tFolderFileList = this.fileAPI.sortFile(tFolder.children.filter(file => file instanceof TFile));

        if(this.decent){
            tFolderFolderList.reverse();
            tFolderFileList.reverse();
        }

        if(this.showFolder){
            tFolderFolderList.forEach(folder => {
                this.setTrInnerHtml(tbody.createEl('tr'), folder, "folder");
            });
        }

        
        tFolderFileList.forEach(file => {
            if ((file.extension === 'md' || file.extension === 'canva') && !this.showMd) return;

            if (file.extension !== 'md' && file.extension !== 'canva' && !this.showAttachments) return;
            this.setTrInnerHtml(tbody.createEl('tr'), file, "file");
        });
        

        this.status = {
            type: 'folder',
            folderPath: tFolder.path
        }
    }

    buildFileInfoPath(folderPath: string) {
        let folderPathContainer = this.contentEl.querySelector('.folder-path-container')!;
        folderPathContainer.innerHTML = '';
        folderPathContainer.createEl('span', { text: " / " });
        if (folderPath == "/") return;

        let absolutePath = "";
        folderPath.split('/').forEach(folderName => {
            absolutePath += folderName;
            let currentAbsolutePath = absolutePath;
            folderPathContainer.createEl('span', { text: folderName, cls: 'folder-path-item' }).addEventListener('click', () => {
                this.buildTableByFolderPath(currentAbsolutePath);
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

        const handlers: Record<string, () => void> = {
            'folder': () => this.buildTableByFolderPath(this.status.folderPath!),
            'vault': () => this.segmentClickHandler('vault'),
            'folder-l2': () => this.segmentClickHandler('folder-l2'),
            'folder-l3': () => this.segmentClickHandler('folder-l3'),
            'tag': () => this.segmentClickHandler('tag')
        };

        const handler = handlers[this.status.type];
        if (handler) handler();
    }

    segmentClickHandler(tab: string) {
        this.contentEl.querySelector('.segment-button.active')?.classList.remove('active');
        this.contentEl.querySelector(`#${tab}`)?.classList.add('active');

        if (tab == 'vault') {
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            this.buildTableByTFolder(this.fileAPI.getRoot()!);
            this.status = { type: 'vault' }
            console.log('vault init');

        } else if (tab == 'folder-l2') {
            this.showFolder = true;
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            let tFolderList: TFolder[] = this.fileAPI.sortFolder(this.fileAPI.getAllFoders().filter(folder => folder.path.split('/').length == 2));

            let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
            tbody.innerHTML = '';
            tFolderList.forEach(Folder => {
                this.setTrInnerHtml(tbody.createEl('tr'), Folder, "folder");
            });

            this.status = { type: 'folder-l2' }
            console.log('folder-l2 clicked');

        } else if (tab == 'folder-l3') {

            console.log('folder-l3 要重新設計');
        } else if (tab == 'tag') {
            this.buildFileInfoPath(this.fileAPI.getRoot()!.path);
            let tagNameList: string[] = this.fileAPI.getAllTagNames();

            let tbody = this.contentEl.querySelector("tbody.file-list-body")!;
            tbody.innerHTML = `<tr>
    <td colspan="${this.properties.length + 1}">
        <div class="metadata-property" tabindex="0" data-property-key="tags" data-property-type="multitext">
            <div class="metadata-property-value">
                <div class="multi-select-container">

                </div>
            </div>
        </div>
    </td>
</tr>`;

            let tagContainer = this.contentEl.querySelector('.metadata-property-value .multi-select-container')!;
            tagNameList.forEach(tagName => {
                this.setTagHtml(tagContainer as HTMLElement, tagName);
            });

            this.status = {
                type: 'tag'
            }
            console.log('tag clicked');
        }
    }



    async onClose() {
        // 清理工作
    }

    private setHtml() {
        this.contentEl.innerHTML = `
			<div class="filex-control-container">
				<div class="search-container">
                    <span class="filex-icon filex-icon-search">s</span>
                    <input type="text" class="search-input" placeholder="搜尋檔案...">
                </div>
                <div class="widget-container">

                    <div class="button-row">
                        <button class="segment-button active" id="vault">Vault</button>
                        <button class="segment-button" id="folder-l2">Folder L2</button>
                        <button class="segment-button" id="folder-l3">Folder L3</button>
                        <button class="segment-button" id="tag">Tag</button>

                    </div>
                    <hr/>
                    <div class="options-row">
                        <div class="checkbox-group">
                            <label>
                                <input type="checkbox" class="sort-order"> decend
                            </label>
                            <label>
                                <input type="checkbox" class="show-attachments" checked> show atta
                            </label>
                            <label>
                                <input type="checkbox" class="show-md" checked> show md/canva
                            </label>
                            <label>
                                <input type="checkbox" class="show-folder" checked> show folder
                            </label>
                        </div>
                        <select class="sort-select">
                            <option value="name">按名稱排序</option>
                            <option value="created">按建立時間排序</option>
                            <option value="modified">按修改時間排序</option>
                        </select>
                    </div>
                </div>
                <div class = "file-info-container">
                    <span class="folder-path">
                        <span class="filex-icon filex-icon-folder"></span>
                        <span class="folder-path-container"></span>
                    </span>
                    <span class="file-count"></span>
                </div>
                <div class="file-list-container">
                    <table class="file-list-table">
                        <thead class="file-list-header">
                            <tr>
                                <th>name</th>
                            </tr>
                        </thead>
                        <tbody class="file-list-body">
                            
                        </tbody>
                    </table>
                </div>
			</div>
            `;
    }

    private setHtmlIcon() {
        setIcon(this.contentEl.querySelector('span.filex-icon-search')!, 'search');
        setIcon(this.contentEl.querySelector('span.filex-icon-folder')!, 'folder-minus');
    }
}
