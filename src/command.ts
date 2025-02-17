import FileXPlugin from "../main";
import { VIEW_TYPE_FILEX_CONTROL } from "./FileXControlView";
import { FileXControlView } from "./FileXControlView";

export default function registerCommands(plugin: FileXPlugin) {
    const getFileXControlView = () => {
        const leaves = plugin.app.workspace.getLeavesOfType(VIEW_TYPE_FILEX_CONTROL);
        if (leaves.length > 0) {
            return leaves[0];
        }

        const new_leaf = plugin.app.workspace.getLeaf(true);
        if (new_leaf) {
            new_leaf.setViewState({
                type: VIEW_TYPE_FILEX_CONTROL,
                active: true
            });
        }
        return new_leaf;
    }
    const activeFileXControlView = () => {
        const leaf = getFileXControlView();
        if (leaf) {
            plugin.app.workspace.revealLeaf(leaf);
        }
    }
    
    plugin.addCommand({
        id: 'open-filex-control',
        name: 'open filex control',
        callback: () => {
            activeFileXControlView();
        },
        hotkeys: [{
            modifiers: [],
            key: 'F3'
        }]

    });

    plugin.addCommand({
        id: 'switch-user-mode',
        name: 'switch user mode',
        callback: () => {
            plugin.settings.userMode = (plugin.settings.userMode) == "read" ? "edit" : "read";
            plugin.saveSettings();
            (getFileXControlView().view as FileXControlView).refresh();
            console.log(plugin.settings.userMode);
        },
        hotkeys: [{
            modifiers: [],
            key: 'F4'
        }]
    });

    plugin.addCommand({
        id: 'refresh',
        name: 'refresh',
        callback: () => {
            (getFileXControlView().view as FileXControlView).refresh();
            console.log('refresh');
        },
        hotkeys: [{
            modifiers: [],
            key: 'F5'
        }]
    });
}