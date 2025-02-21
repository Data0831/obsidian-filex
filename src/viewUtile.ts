import { App, WorkspaceLeaf } from 'obsidian';

export function getView(app: App, viewType: string): WorkspaceLeaf {
    const leaves = app.workspace.getLeavesOfType(viewType);
    if (leaves.length > 0) {
        return leaves[0];
    }

    const new_leaf = app.workspace.getLeaf(true);
    if (new_leaf) {
        new_leaf.setViewState({
            type: viewType,
            active: true
        });
    }
    return new_leaf;
}

export function activeView(app: App, viewType: string) {
    const leaf = getView(app, viewType);
    if (leaf) {
        app.workspace.revealLeaf(leaf);
    }
}