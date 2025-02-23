3. view class 有 contentEl 屬性，可以存取 view 的 html 元素
6. Obsidian 在其核心樣式中，會定義一系列以 -- 開頭的 CSS 變數，這些變數可以在 plugin 的 CSS 中使用

8. css transition
10. match(/[a-zA-Z]/)
11. spilt 與 slice 的用法
12. 直接將物件傳遞到 onclick 字串中會導致 [object Object] 的問題。
13. targetLinkEle.removeAttribute('id');
14. WebKit 要支援 nested CSS https://blog.gslin.org/archives/2023/02/16/11065/webkit-%E8%A6%81%E6%94%AF%E6%8F%B4-nested-css-%E4%BA%86/
15. rem, em 字體相對
16. gap: 8px; 是 css 的語法，表示元素之間的間距為 8px
17. slice(0, -1)
18. java script 閉包問題
  folderPath.split('/').forEach(folderName => {
            absolutePath += folderName;
            folderPathContainer.createEl('span', { text: folderName, cls: 'folder-path-item' }).addEventListener('click', () => {
                console.log('絕對: ', absolutePath); // 輸出應該是 資料夾/資料夾 但實際上是 資料夾/資料夾/
                console.log('資料: ', folderName);
                // this.buildTableByFolderPath(absolutePath);
            });
            folderPathContainer.createEl('span', { text: " / " });
            absolutePath += "/"; // 這裡有問題
        });


問題出在於你在迴圈中，每次迭代都會先將 `folderName` 加到 `absolutePath`，然後才設定 click 事件監聽器。在監聽器設定完成後，你又立即在 `absolutePath` 後面加上了斜線 `/`。這導致當 click 事件觸發時，監聽器內部的 `absolutePath` 已經是被加上斜線之後的值。
為了修正這個問題，我引入了一個新的變數 `currentAbsolutePath`。在每次迭代中，`currentAbsolutePath` 會儲存當前資料夾的路徑，**不包含**尾端的斜線。然後，click 事件監聽器會使用這個 `currentAbsolutePath`。只有在完成當前迭代後，`absolutePath` 才會被更新，加上當前 `folderName` 和斜線 `/`，為下一次迭代做準備。
這樣修改後，當你點擊路徑中的資料夾名稱時，`console.log('絕對: ', currentAbsolutePath);` 應該會輸出正確的路徑，而不會包含尾端的斜線。
你的疑問很好，這涉及到 JavaScript 的**閉包 (closure)** 和迴圈的運作方式。雖然程式碼的順序看起來像是先設定好路徑再加斜線，但實際上在迴圈和事件監聽器 (event listener) 的情況下，行為會有所不同。

讓我更詳細地解釋為什麼原本的程式碼會有問題，以及為什麼需要 `currentAbsolutePath` 這個額外變數：

**問題點：閉包與迴圈的互動**

在你的原始碼中，`addEventListener` 裡面的匿名函式（也就是 click 事件發生時執行的函式）形成了一個閉包。這個閉包會**記住**它被建立時所處的作用域 (scope) 中的變數。

在迴圈的每次迭代中，你都在創建一個新的 `span` 元素，並為它添加一個 click 事件監聽器。**重點是，所有的這些事件監聽器都閉包了同一個變數 `absolutePath`。**

當迴圈執行完成後，`absolutePath` 的值已經被累積到最終的路徑 (例如 "folder1/folder2/folder3/")。這時，無論你點擊哪個 `span` 元素（"folder1"、"folder2" 或 "folder3"），當事件監聽器被觸發時，它訪問的都是**同一個** `absolutePath` 變數，而這個變數已經是迴圈結束時的最終值了。

**圖解說明 (原始碼問題)**

假設 `folderPath` 是 "資料夾1/資料夾2/資料夾3"。
迴圈第一次迭代 (folderName = "資料夾1")
absolutePath 變成 "資料夾1"
為 "資料夾1" 的 span 元素建立 click 事件監聽器。這個監聽器記住了 absolutePath 變數。
absolutePath 變成 "資料夾1/"
迴圈第二次迭代 (folderName = "資料夾2")
absolutePath 變成 "資料夾1/資料夾2"
為 "資料夾2" 的 span 元素建立 click 事件監聽器。這個監聽器也記住了 同一個 absolutePath 變數。
absolutePath 變成 "資料夾1/資料夾2/"
迴圈第三次迭代 (folderName = "資料夾3")
absolutePath 變成 "資料夾1/資料夾2/資料夾3"
為 "資料夾3" 的 span 元素建立 click 事件監聽器。這個監聽器同樣記住了 同一個 absolutePath 變數。
absolutePath 變成 "資料夾1/資料夾2/資料夾3/"
當你點擊任何一個 "資料夾1"、"資料夾2" 或 "資料夾3" 的 span 時，它們的事件監聽器都會被觸發，並且它們都會去讀取它們所閉包的 absolutePath 變數。但因為它們閉包的是同一個 absolutePath 變數，而且這個變數在迴圈結束後已經是最終值 "資料夾1/資料夾2/資料夾3/"，所以無論你點擊哪個，輸出的 absolutePath 都會是最終值，而不是你點擊的那個資料夾的當前路徑。
currentAbsolutePath 的作用
引入 currentAbsolutePath 的目的是在每次迴圈迭代中，為當前的事件監聽器創建一個獨立的、不會被後續迭代影響的路徑值。
圖解說明 (修正後的程式碼)
迴圈第一次迭代 (folderName = "資料夾1")
currentAbsolutePath 被設定為 absolutePath + folderName，也就是 "資料夾1"。
為 "資料夾1" 的 span 元素建立 click 事件監聽器。這個監聽器記住了 currentAbsolutePath 變數的值 (此時是 "資料夾1")。
absolutePath 變成 "資料夾1/" (為下一次迭代更新 absolutePath)
迴圈第二次迭代 (folderName = "資料夾2")
currentAbsolutePath 被設定為 absolutePath + folderName，也就是 "資料夾1/資料夾2"。
為 "資料夾2" 的 span 元素建立 click 事件監聽器。這個監聽器記住了 currentAbsolutePath 變數的值 (此時是 "資料夾1/資料夾2")。
absolutePath 變成 "資料夾1/資料夾2/" (為下一次迭代更新 absolutePath)
迴圈第三次迭代 (folderName = "資料夾3")
currentAbsolutePath 被設定為 absolutePath + folderName，也就是 "資料夾1/資料夾2/資料夾3"。
為 "資料夾3" 的 span 元素建立 click 事件監聽器。這個監聽器記住了 currentAbsolutePath 變數的值 (此時是 "資料夾1/資料夾2/資料夾3")。
absolutePath 變成 "資料夾1/資料夾2/資料夾3/" (為下一次迭代更新 absolutePath)
現在，當你點擊 "資料夾1" 的 span 時，它的事件監聽器會讀取它所閉包的 currentAbsolutePath 的值，這個值在第一次迭代時被設定為 "資料夾1"，並且不會被後續的迭代影響。同樣地，點擊 "資料夾2" 的 span 會讀取到 "資料夾1/資料夾2"，點擊 "資料夾3" 會讀取到 "資料夾1/資料夾2/資料夾3"。
總結
使用 currentAbsolutePath 的關鍵在於，它在每次迴圈迭代中都創建了一個新的、獨立的變數來儲存當前的路徑值。這樣，每個事件監聽器閉包的都是各自獨立的路徑值，而不是共享同一個會被迴圈不斷更新的變數。
希望這個更詳細的解釋能幫助你理解為什麼需要額外變數以及閉包在這種情況下的作用。 JavaScript 的閉包是一個比較容易混淆的概念，但理解它對於處理迴圈和事件監聽器等非同步操作非常重要。

width: fit-content;

在 TypeScript 中，`const` 和 `var as const` 之間有一些重要的區別。以下是它們的主要差異：

### 1. `const`

- **定義**：`const` 用於聲明一個常量，這意味著該變量的引用不能被重新賦值。
- **可變性**：如果 `const` 用於對象或數組，對象的屬性或數組的元素仍然可以被修改，但變量本身的引用不能改變。
- **類型推斷**：TypeScript 會根據賦值推斷變量的類型，但不會將其視為字面量類型。

```typescript
const myArray = [1, 2, 3];
myArray.push(4); // 這是合法的
// myArray = [5, 6]; // 這會導致錯誤，因為 myArray 是 const

const myObject = { name: 'Alice' };
myObject.name = 'Bob'; // 這是合法的
// myObject = { name: 'Charlie' }; // 這會導致錯誤
```

### 2. `var as const`

- **定義**：`as const` 是一個類型斷言，用於將對象或數組的類型設置為字面量類型，並使其屬性變為只讀。
- **可變性**：使用 `as const` 的對象或數組的屬性將被視為只讀，這意味著它們的值不能被修改。
- **類型推斷**：TypeScript 將對象或數組的屬性推斷為具體的字面量類型，而不是一般的類型。

```typescript
const myArray = [1, 2, 3] as const;
// myArray.push(4); // 這會導致錯誤，因為 myArray 是只讀的

const myObject = { name: 'Alice' } as const;
// myObject.name = 'Bob'; // 這會導致錯誤，因為 name 是只讀的
```

### 總結

- `const` 用於聲明常量，防止變量的引用被重新賦值，但對象的屬性仍然可以被修改。
- `as const` 用於將對象或數組的類型設置為字面量類型，並使其屬性變為只讀，防止任何修改。

這兩者的使用場景不同，根據需要選擇合適的方式來提高代碼的安全性和可維護性。

as const


arrow function 部會有 bind this 問題，但一般 function 會有 bind this 問題

Object.values , assign, entries, keys, fromEntries


`debounce` 是一種編程技術，通常用於限制某個函數的執行頻率。當你在短時間內多次觸發某個事件（例如，輸入框的輸入事件），`debounce` 可以確保只有在事件停止觸發一段時間後，才會執行指定的函數。這樣可以避免因為頻繁觸發而導致性能問題或不必要的計算。

在你提供的代碼中，`debounce` 函數的實現如下：

```typescript
const debounce = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeoutId); // 清除之前的計時器
        timeoutId = setTimeout(() => fn.apply(this, args), delay); // 設置新的計時器
    };
};
```

這段代碼的工作原理是：

1. 當事件被觸發時，`debounce` 會清除之前的計時器（如果有的話）。
2. 然後，它會設置一個新的計時器，只有在指定的延遲時間（`delay`）過後，才會執行傳入的函數（`fn`）。
3. 如果在延遲時間內再次觸發事件，計時器會被重置，這樣函數就不會被執行。

這樣的設計可以有效地減少函數的調用次數，特別是在用戶快速輸入或頻繁觸發事件的情況下。


在 JavaScript 中，當你使用 `addEventListener` 方法來為某個 DOM 元素添加事件監聽器時，當事件發生時，瀏覽器會自動將一個事件對象作為第一個參數傳遞給事件處理函數。這個事件對象包含了有關事件的詳細信息，例如事件的類型、目標元素、時間戳等。

在你的代碼中，這一行：

```typescript
searchInput.addEventListener('input', handleSearch);
```

這表示當 `searchInput` 元素發生 `input` 事件時，會調用 `handleSearch` 函數。當事件發生時，瀏覽器會自動創建一個事件對象並將其傳遞給 `handleSearch` 函數，這就是為什麼 `handleSearch` 函數的定義中有 `(e: Event)` 這個參數。

具體來說，`(e: Event)` 代表了事件對象，這個對象包含了以下一些屬性和方法：

- **`e.target`**：觸發事件的元素，這裡是 `searchInput`。
- **`e.type`**：事件的類型，例如 `'input'`。
- **`e.preventDefault()`**：可以用來阻止事件的默認行為（例如，防止表單提交）。
- **`e.stopPropagation()`**：可以用來阻止事件冒泡到父元素。

因此，在 `handleSearch` 函數中，你可以使用 `e` 來獲取觸發事件的元素的相關信息，例如：

```typescript
this.filter.searchText = (e.target as HTMLInputElement).value;
```

這行代碼從事件對象中獲取了觸發事件的元素（即搜尋輸入框），並取得其當前的值，然後將其賦值給 `this.filter.searchText`。這樣就能夠根據用戶的輸入來更新搜尋條件。



headerTr.insertAdjacentHTML('beforeend', headerHtml);
這行程式碼的意思是將 `headerHtml` 的內容插入到 `headerTr` 的結尾部分。具體來說，這行程式碼使用了 `insertAdjacentHTML` 方法，這是一個 DOM 操作的方法，可以在指定的元素周圍插入 HTML 內容。

在這個例子中，`headerTr` 是一個表格的行元素（`<tr>`），而 `headerHtml` 是一個包含多個表頭單元格（`<th>`）的 HTML 字串。這行程式碼的作用是將這些表頭單元格添加到表格行的末尾，從而動態生成表格的標題。

以下是這行程式碼的具體解釋：

- `headerTr`：指向表格的行元素。
- `insertAdjacentHTML('beforeend', headerHtml)`：將 `headerHtml` 的內容插入到 `headerTr` 的結尾，這樣 `headerHtml` 中的所有 HTML 內容都會成為 `headerTr` 的子元素。

這樣做的目的是在表格的標題行中動態添加新的列標題。

export type FilesAndFolders = TFile[] | TFolder[];


export enum Action {
    Search = 'search',
    Filter = 'filter',
    Sort = 'sort',
}
export type SegmentKey = 'vault' | 'folder-l2' | 'all-files' | 'tag' | 'not-link';
在這段程式碼中，`enum` 和 `type` 的選擇取決於你的需求。以下是它們的比較：

1. **`enum`**:
   - 用於定義一組命名的常數，這些常數可以是數字或字串。
   - 可以在程式中使用 `Action.Search` 這樣的方式來引用，這樣的寫法更具可讀性。
   - 會在編譯後生成一個物件，這可能會增加一些額外的開銷。

2. **`type`**:
   - 用於定義一組可能的字串值，這些值不會生成任何額外的物件。
   - 更加靈活，可以用於定義複雜的型別結構。
   - 例如，`SegmentKey` 可以用於定義一組特定的字串，這樣在使用時可以進行更嚴格的型別檢查。

### 總結
- 如果你需要一組常數並且希望能夠使用更具可讀性的方式來引用它們，則使用 `enum` 會更好。
- 如果你只需要一組字串型別，並且希望保持輕量級，則使用 `type` 會更合適。

根據你的具體需求選擇適合的方式。


.file-list-body a {
            width: fit-content;

debounce 雖然能延遲，但好像沒有改變他的重複觸發性吧，只是延遲了觸發時間


在你提供的程式碼中，`Search` 是 `Action` 列舉（enum）中的一個成員。這個列舉的型別是 `Action`，它的定義如下：

```typescript
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
```

因此，`Search` 的型別是 `Action`，並且它的值是字串 `'search'`。這意味著 `Search` 可以用來表示一個特定的動作，並且在程式中可以用 `Action.Search` 來引用它。
是的，TypeScript 中的 `enum` 可以不填值。在這種情況下，TypeScript 會自動為每個成員分配一個數字值，從 0 開始遞增。例如：

```typescript
enum Color {
    Red,    // 0
    Green,  // 1
    Blue    // 2
}
```

在這個例子中，`Red` 的值是 0，`Green` 的值是 1，`Blue` 的值是 2。

你也可以混合使用自定義值和自動生成的值。例如：

```typescript
enum Status {
    Active = 1, // 1
    Inactive,   // 2
    Pending     // 3
}
```

在這個例子中，`Active` 被明確設置為 1，然後 `Inactive` 和 `Pending` 將自動分配為 2 和 3。

總結來說，`enum` 的成員可以不填值，TypeScript 會自動為它們分配數字值。
