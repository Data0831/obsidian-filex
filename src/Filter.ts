import { SegmentKey, CheckboxKey } from './FileXHtml';
import {  ROOT_FOLDER_PATH } from './Lib';

export enum Action {
    Search = 'search',
    Segment = 'segment',
    Folder = 'folder',
    Tag = 'tag',
    Command = 'command',

    Show = 'show',
    Sort = 'sort',

    None = 'none',
}

export function isFileChangeAction(action: Action): boolean {
    return action === Action.Search || action === Action.Segment || action === Action.Folder || action === Action.Tag || action === Action.Command;
}

export function isFolderChangeAction(action: Action): boolean {
    return action === Action.Folder || action === Action.Segment;
}

export function isUiChangeAction(action: Action): boolean {
    return action === Action.Show || action === Action.Sort;
}

export function isNoneAction(action: Action): boolean {
    return action === Action.None;
}

export class Filter {
    private _searchText: string;
    private _segment: SegmentKey;
    private _action: Action;
    private _tags: string[];
    private _folderPath: string;

    private _showAttachment: boolean;
    private _showMd: boolean;
    private _showFolder: boolean;
    private _showAmount: boolean;
    private _sortAccending: boolean;
    private _sortKey: string;

    get searchText(): string {
        return this._searchText;
    }

    set searchText(value: string) {
        this._searchText = value;
        this._action = Action.Search;
    }

    get segment(): SegmentKey {
        return this._segment;
    }

    set segment(value: SegmentKey) {
        this._segment = value;
        this._action = Action.Segment;
    }

    get action(): Action {
        return this._action;
    }
    
    set action(value: Action) {
        this._action = value;
    }

    get tags(): string[] {
        return this._tags;
    }
    
    set tags(value: string[]) {
        this._tags = value;
        this._action = Action.Tag;
    }

    get folderPath(): string {
        return this._folderPath;
    }

    set folderPath(value: string) {
        this._folderPath = value;
        this._action = Action.Folder;
    }

    get showAttachment(): boolean {
        return this._showAttachment;
    }

    set showAttachment(value: boolean) {
        this._showAttachment = value;
        this._action = Action.Show;
    }

    get showMdAndCanvas(): boolean {
        return this._showMd;
    }

    set showMdAndCanvas(value: boolean) {
        this._showMd = value;
        this._action = Action.Show;
    }

    get showFolder(): boolean {
        return this._showFolder;
    }

    set showFolder(value: boolean) {
        this._showFolder = value;
        this._action = Action.Show;
    }

    get showAmount(): boolean {
        return this._showAmount;
    }

    set showAmount(value: boolean) {
        this._showAmount = value;
        this._action = Action.Show;
    }

    get sortAccending(): boolean {
        return this._sortAccending;
    }

    set sortAccending(value: boolean) {
        this._sortAccending = value;
        this._action = Action.Sort;
    }

    get sortKey(): string {
        return this._sortKey;
    }

    set sortKey(value: string) {
        this._sortKey = value;
        this._action = Action.Sort;
    }

    constructor(segment: SegmentKey, action: Action) {
        this._segment = segment;
        this._action = action;
        this._searchText = "";
        this._tags = [];
        this._folderPath = ROOT_FOLDER_PATH;
        this._showAttachment = true;
        this._showMd = true;
        this._showFolder = true;
        this._showAmount = false;
        this._sortAccending = true;
        this._sortKey = 'name';
    }

    public createNewCopy(): Filter {
        let newFilter = new Filter(this._segment, this._action);
        newFilter._searchText = this._searchText;
        newFilter._tags = this._tags;
        newFilter._folderPath = this._folderPath;
        newFilter._showAttachment = this._showAttachment;
        newFilter._showMd = this._showMd;
        newFilter._showFolder = this._showFolder;
        newFilter._showAmount = this._showAmount;
        newFilter._sortAccending = this._sortAccending;
        newFilter._sortKey = this._sortKey;
        return newFilter;
    }

    public copyValue(filter: Filter) {
        this._segment = filter._segment;
        this._action = filter._action;
        this._searchText = filter._searchText;
        this._tags = filter._tags;
        this._folderPath = filter._folderPath;
        this._showAttachment = filter._showAttachment;
        this._showMd = filter._showMd;
        this._showFolder = filter._showFolder;
        this._showAmount = filter._showAmount;
        this._sortAccending = filter._sortAccending;
        this._sortKey = filter._sortKey;
    }

    public isSearchTextEmptyOrUndefined(): boolean {
        return this._searchText === undefined || this._searchText === '';
    }

    public filterEquality(filter: Filter): boolean {
        if (isUiChangeAction(this._action)) return true;

        if (this._action !== filter._action) return false;
        if (this._searchText !== filter._searchText) return false;
        if (this._segment !== filter._segment) return false;
        if (this._tags?.length !== filter._tags?.length) return false;
        if (this._tags?.some((tag, index) => tag !== filter._tags![index])) return false;
        if (this._folderPath !== filter._folderPath) return false;

        return true;
    }

    public toggleCheckbox(checkboxKey: CheckboxKey) {
        switch (checkboxKey) {
            case CheckboxKey.ShowAttachments:
                this._showAttachment = !this._showAttachment;
                break;
            case CheckboxKey.ShowMd:
                this._showMd = !this._showMd;
                break;
            case CheckboxKey.ShowFolder:
                this._showFolder = !this._showFolder;
                break;
            case CheckboxKey.ShowAmount:
                this._showAmount = !this._showAmount;
                break;
        }
        this._action = Action.Show;
    }

    public toggleSortOrder(sortKey: string) {
        if (this._sortKey === sortKey) {
            this._sortAccending = !this._sortAccending;
        } else {
            this._sortKey = sortKey;
            this._sortAccending = true;
        }
        this._action = Action.Sort;
    }
}
export const defaultFileFilter = new Filter(SegmentKey.Vault, Action.Segment);
export const noneFileFilter = new Filter(SegmentKey.None, Action.None);

