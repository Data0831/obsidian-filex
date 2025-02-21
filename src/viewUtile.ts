import { App, WorkspaceLeaf } from 'obsidian';

/**
 * 獲取指定類型的視圖葉子（WorkspaceLeaf）
 * 如果已存在該類型的視圖，則返回第一個找到的視圖
 * 如果不存在，則創建一個新的視圖
 * 
 * @param {App} app - Obsidian 應用程序實例
 * @param {string} viewType - 要獲取或創建的視圖類型
 * @param {boolean} [createNew=true] - 是否要創建新的視圖
 * @returns {WorkspaceLeaf} 返回找到的或新創建的視圖葉子
 */
export function getView(app: App, viewType: string, createNew: boolean = true): WorkspaceLeaf | null {
    const leaves = app.workspace.getLeavesOfType(viewType);
    if (leaves.length > 0)
        return leaves[0];

    if (!createNew)
        return null;

    const new_leaf = app.workspace.getLeaf(true);
    if (new_leaf) {
        new_leaf.setViewState({
            type: viewType,
            active: true
        });
    }
    return new_leaf;
}

/**
 * 激活並顯示指定類型的視圖
 * 如果視圖不存在則會創建一個新的視圖並顯示
 * 
 * @param {App} app - Obsidian 應用程序實例
 * @param {string} viewType - 要激活的視圖類型
 */
export function activeView(app: App, viewType: string) {
    const leaf = getView(app, viewType);
    if (leaf) {
        app.workspace.revealLeaf(leaf);
    }
}