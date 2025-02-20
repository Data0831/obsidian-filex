import FileXPlugin from "../main";
import { VIEW_TYPE_FILEX_CONTROL } from "./FileXControlView";
import { FileXControlView } from "./FileXControlView";
import { getAllTags, ItemView, Notice, MarkdownView } from "obsidian";
import { FileAPI } from "./FileAPI";
import { TagSelectModal } from "./TagSelectModal";
import { FileXFilter } from "./types";

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

    plugin.addCommand({
        id: 'link-generate',
        name: 'link generate',
        callback: () => {
            const activeFile = plugin.app.workspace.getActiveFile();
            const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);

            if (!activeFile || activeFile.extension.toLowerCase() !== 'md') {
                new Notice('請在 md 檔案中使用此功能');
                return;
            }

            if (!activeView || activeView.getMode() !== 'source') {
                new Notice('請在編輯模式下使用此功能');
                return;
            }

            const cache = plugin.app.metadataCache.getFileCache(activeFile);
            if (!cache) {
                new Notice('無法獲取檔案緩存');
                return;
            }

            const fileTags = getAllTags(cache) || [];
            if (fileTags.length === 0) {
                new Notice('當前檔案沒有任何標籤');
                return;
            }

            new TagSelectModal(plugin.app, fileTags, (selectedTag: string) => {
                const fileAPI = new FileAPI(plugin.app.workspace.getActiveViewOfType(ItemView)!);
                const allFiles = fileAPI.getAllFiles();
                const filter: FileXFilter = {
                    segment: 'tag',
                    tags: [selectedTag]
                };
                const filteredFiles = fileAPI.sortFile(fileAPI.filterItems(allFiles, filter));
                
                const editor = plugin.app.workspace.activeEditor?.editor;
                if (editor) {
                    const links = filteredFiles
                        .filter(file => file.path !== activeFile.path)
                        .map(file => `- [[${file.basename}]]`)
                        .join('\n');
                    
                    if (links) {
                        const cursor = editor.getCursor();
                        editor.replaceRange('\n' + links + '\n', cursor);
                    } else {
                        new Notice('沒有找到相關的檔案');
                    }
                }
            }).open();
        },
    });
}