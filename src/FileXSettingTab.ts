import { App, PluginSettingTab, Setting } from 'obsidian';
import FileXPlugin from '../main';

export class FileXSettingTab extends PluginSettingTab {
	plugin: FileXPlugin;

	constructor(app: App, plugin: FileXPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('table header')
			.setDesc('spilt by comma')
			.addText(text => text
				.setPlaceholder('Enter your properties')
				.setValue(this.plugin.settings.properties)
				.onChange(async (value) => {
					this.plugin.settings.properties = value;
					await this.plugin.saveSettings();
				}));
	}
}