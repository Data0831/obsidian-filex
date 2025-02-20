import { Plugin } from 'obsidian';
import { FileXSettings, DEFAULT_SETTINGS } from './FileXSettings';
import { FileXSettingTab } from './FileXSettingTab';
import registerCommands from './FileXcommand';
import { FileXControlView, VIEW_TYPE_FILEX_CONTROL } from './FileXControlView';
import { initBreadcrumbListener } from './FileXControlView';

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