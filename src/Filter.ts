import { Action, ActionFunc, DEFAULT_FILTER_VALUE, EMPTY_STRING, Segment, Checkbox, Command } from './Lib';

export class Filter {
    private _searchText: string = DEFAULT_FILTER_VALUE.searchText; //todo: 可能會有 search field 等等
    private _segment: Segment = DEFAULT_FILTER_VALUE.segment;
    private _action: Action = DEFAULT_FILTER_VALUE.action;
    private _command: Command = DEFAULT_FILTER_VALUE.command;
    private _tags: Set<string> = DEFAULT_FILTER_VALUE.tags;
    private _path: string = DEFAULT_FILTER_VALUE.path;
    private _showAttachment: boolean = DEFAULT_FILTER_VALUE.showAttachment;
    private _showMd: boolean = DEFAULT_FILTER_VALUE.showMd;
    private _showFolder: boolean = DEFAULT_FILTER_VALUE.showFolder;
    private _showAmount: boolean = DEFAULT_FILTER_VALUE.showAmount;
    private _sortAccending: boolean = DEFAULT_FILTER_VALUE.sortAccending;
    private _property: string = DEFAULT_FILTER_VALUE.property;

    get searchText(): string {
        return this._searchText;
    }

    set searchText(value: string) {
        this._searchText = value;
        this._action = Action.Search;
    }

    get segment(): Segment {
        return this._segment;
    }

    set segment(value: Segment) {
        this._segment = value;
        this._action = Action.Segment;
    }

    get action(): Action {
        return this._action;
    }

    set action(value: Action) {
        this._action = value;
    }

    get command(): Command {
        return this._command;
    }

    set command(value: Command) {
        this._command = value;
        this._action = Action.Command;
    }

    get tags(): Set<string> {
        return this._tags;
    }

    set tags(value: string[] | Set<string>) {
        this._tags = value instanceof Set ? value : new Set(value);
        this._action = Action.Tag;
    }

    get path(): string {
        return this._path;
    }

    set path(value: string) {
        this._path = value;
        this._action = Action.Folder;
    }

    get showAttachment(): boolean {
        return this._showAttachment;
    }

    get showMdAndCanvas(): boolean {
        return this._showMd;
    }

    get showFolder(): boolean {
        return this._showFolder;
    }

    get showAmount(): boolean {
        return this._showAmount;
    }

    get sortAccending(): boolean {
        return this._sortAccending;
    }

    get property(): string {
        return this._property;
    }

    constructor(segment: Segment, action: Action, command: Command = Command.Undefined) {
        this._segment = segment;
        this._action = action;
        this._command = command;
    }

    public static DefaultFilter = () => new Filter(Segment.Vault, Action.Segment);
    public static UndefinedFilter = () => new Filter(Segment.None, Action.Undfined);
    public static CommandFilter = (command: Command) => new Filter(Segment.None, Action.Command, command);
    
    public copyValueFrom(filter: Filter) {
        this._segment = filter._segment;
        this._action = filter._action;
        this._searchText = filter._searchText;
        this._tags = filter._tags;
        this._path = filter._path;
        this._showAttachment = filter._showAttachment;
        this._showMd = filter._showMd;
        this._showFolder = filter._showFolder;
        this._showAmount = filter._showAmount;
        this._sortAccending = filter._sortAccending;
        this._property = filter._property;
    }

    public isSearchTextEmpty(): boolean {
        return this._searchText === EMPTY_STRING;
    }

    public equal(filter: Filter): boolean {
        if (ActionFunc.isFileMapNotNeedUpdate(this._action)) return true;

        if (this._action !== filter._action ||
            this._searchText !== filter._searchText ||
            this._segment !== filter._segment ||
            this._path !== filter._path) {
            return false;
        }

        if (this._tags.size !== filter._tags.size) return false;

        for (let tag of this._tags) {
            if (!filter._tags.has(tag)) return false;
        }

        return true;
    }

    public toggleCheckbox(checkboxKey: Checkbox) {
        switch (checkboxKey) {
            case Checkbox.ShowAttachments:
                this._showAttachment = !this._showAttachment;
                break;
            case Checkbox.ShowMd:
                this._showMd = !this._showMd;
                break;
            case Checkbox.ShowFolder:
                this._showFolder = !this._showFolder;
                break;
            case Checkbox.ShowAmount:
                this._showAmount = !this._showAmount;
                break;
        }
        this._action = Action.Show;
    }

    public togglePropertyOrder(property: string) {
        if (this._property === property) {
            this._sortAccending = !this._sortAccending;
        } else {
            this._property = property;
            this._sortAccending = true;
        }
        this._action = Action.Sort;
    }
}


