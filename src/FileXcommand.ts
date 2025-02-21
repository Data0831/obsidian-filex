import FileXPlugin from "../main";
import { VIEW_TYPE_FILEX } from "./FileXView";
import { FileXView } from "./FileXView";
import { getAllTags, Notice, MarkdownView, ItemView } from "obsidian";
import { FileAPI } from "./FileAPI";
import { TagSelectModal } from "./TagSelectModal";
import { Filter, Action } from "./Filter";
import { SegmentKey } from './FileXHtml';
import { activeView, getView } from './viewUtile';

export default function registerCommands(plugin: FileXPlugin) {
    const activeFileXControlView = () => activeView(plugin.app, VIEW_TYPE_FILEX);
    
    plugin.addCommand({
        id: 'open-filex-control',
        name: 'open filex control',
        callback: () => {
            activeFileXControlView();
            new Notice('已開啟 FileX 控制面板');
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
            const view = getView(plugin.app, VIEW_TYPE_FILEX, false);
            if (view) {
                (view.view as FileXView).refresh();
                new Notice(`切換成 ${plugin.settings.userMode} 模式`);
            }
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
            const view = getView(plugin.app, VIEW_TYPE_FILEX, false);
            if (view) {
                (view.view as FileXView).refresh();
                new Notice('刷新成功');
            }
        },
        hotkeys: [{
            modifiers: [],
            key: 'F5'
        }]
    });

    plugin.addCommand({
        id: 'tag-link-generate',
        name: 'tag link generate',
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
                new Notice(`已選擇標籤：${selectedTag}`);
                const fileAPI = new FileAPI(plugin.app.workspace.getActiveViewOfType(ItemView)!);
                const filter = new Filter(SegmentKey.Tag, Action.Segment);
                fileAPI.getFileAndFolderByFilter(filter);
                filter.action = Action.Tag;
                filter.tags = [selectedTag];
                const allFiles = fileAPI.getFileAndFolderByFilter(filter).files;
                const filteredFiles = fileAPI.sortFile(allFiles);
                console.log(selectedTag, filteredFiles);
                
                const editor = plugin.app.workspace.activeEditor?.editor;
                if (editor) {
                    const links = filteredFiles
                        .filter(file => file.path !== activeFile.path)
                        .map(file => `- [[${file.basename}]]`)
                        .join('\n');
                    
                    if (links) {
                        const cursor = editor.getCursor();
                        editor.replaceRange('\n' + links + '\n', cursor);
                        new Notice('已成功生成相關檔案連結');
                    } else {
                        new Notice('沒有找到相關的檔案');
                    }
                }
            }).open();
        },

        hotkeys: [{
            modifiers: [],
            key: 'F6'
        }]
    });
}