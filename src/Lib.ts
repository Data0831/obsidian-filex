export const ROOT_FOLDER_PATH: string = "/";
export const NO_TAG: string = "|no-tag";
export const EMPTY_STRING: string = "";
export const VIEW_TYPE_FILEX = 'filex-control';
export const VIEW_NAME_FILEX = 'FileX';

export interface DomCache {
    contentEl: HTMLElement;
    searchContainer: HTMLElement;
    widgetContainer: HTMLElement;
    fileInfoContainer: HTMLElement;
    tagsContainer: HTMLElement;
    multiSelectContainer: HTMLElement;
    tbody: HTMLElement;
    headerTr: HTMLElement;
    folderPathContainer: HTMLElement;
    fileCount: HTMLElement;
}

export enum Action {
    Search,
    Segment,
    Folder,
    Tag,
    Command,

    Show,
    Sort,

    Undfined,
    Refresh,
}

export enum Segment {
    Vault = 'vault',
    FolderL2 = 'folder-l2',
    AllFiles = 'all-files',
    UnLinked = 'unlinked',
    Tag = 'tag',
    None = 'none'
}

export enum Command{
    GenLink,

    Undefined,
}

export const DEFAULT_FILTER_VALUE={
    searchText: EMPTY_STRING,
    segment: Segment.Vault,
    action: Action.Segment,
    command: Command.Undefined,
    tags: new Set<string>(),
    path: ROOT_FOLDER_PATH,
    showAttachment: true,
    showMd: true,
    showFolder: true,
    showAmount: false,
    sortAccending: true,
    property: "name"
}

export enum Checkbox {
    ShowAttachments = 'show-attachments',
    ShowMd = 'show-md',
    ShowFolder = 'show-folder',
    ShowAmount = 'show-amount'
}

export class ActionFunc {
    public static isFileMapNeedUpdate(action: Action): boolean {
        return action === Action.Search || action === Action.Segment || action === Action.Folder || action === Action.Tag || action === Action.Command || action === Action.Refresh;
    }

    public static isFileMapNotNeedUpdate(action: Action): boolean {
        return action === Action.Show || action === Action.Sort;
    }

    public static isFolderPathNeedUpdate(action: Action): boolean {
        return action === Action.Folder || action === Action.Segment;
    }

    public static isUndefined(action: Action): boolean {
        return action === Action.Undfined;
    }
}

export const Debug = {
    log: (...args: any[]) => {
        console.log(...args);
    }
};

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return function (this: any, ...args: Parameters<T>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
