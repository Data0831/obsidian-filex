import { Plugin } from 'obsidian';
import { FileXSettings, DEFAULT_SETTINGS } from './FileXSettings';
import { FileXSettingTab } from './FileXSettingTab';
import registerCommands from './command';


import { FileXControlView, VIEW_TYPE_FILEX_CONTROL } from './FileXControlView';


export class FileXPlugin extends Plugin {
    settings: FileXSettings;


    async onload() {
        await this.init(this);
        await this.loadSettings();
        registerCommands(this);
        this.addSettingTab(new FileXSettingTab(this.app, this));
        this.registerView(VIEW_TYPE_FILEX_CONTROL, (leaf) => new FileXControlView(leaf, this));
    }

    onunload() {

    }

    async init(plugin: FileXPlugin) {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }


    async saveSettings() {
        await this.saveData(this.settings);
    }
}