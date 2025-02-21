import { Plugin, App } from 'obsidian';
import { FileXSettings, DEFAULT_SETTINGS } from './FileXSettings';
import { FileXSettingTab } from './FileXSettingTab';
import registerCommands from './FileXcommand';
import { FileXControlView, VIEW_TYPE_FILEX_CONTROL } from './FileXControlView';
import { Action } from './Filter';

export function initBreadcrumbListener(app: App) {
    function handleBreadcrumbClick(app: App, path: string) {
        const leaves = app.workspace.getLeavesOfType(VIEW_TYPE_FILEX_CONTROL);
        if (leaves.length > 0) {
            const view = leaves[0].view as FileXControlView;
            view.filter.folderPath = path;
            view.filter.action = Action.Folder;
            view.refresh();
            app.workspace.revealLeaf(leaves[0]);
        }
    }

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

                handleBreadcrumbClick(app, fullPath);
            }
        }
    };
    document.addEventListener('click', handleClick, true);
}

export class FileXPlugin extends Plugin {
    settings: FileXSettings;

    async onload() {
        await this.loadSettings();
        this.registerCommands();
        this.addSettingTab(new FileXSettingTab(this.app, this));
        initBreadcrumbListener(this.app);
        this.registerView(VIEW_TYPE_FILEX_CONTROL, (leaf) => new FileXControlView(leaf, this));
    }

    onunload() {

    }

    private registerCommands(){
        registerCommands(this);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }


    async saveSettings() {
        await this.saveData(this.settings);
    }
}