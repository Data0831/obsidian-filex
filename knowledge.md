3. view class 有 contentEl 屬性，可以存取 view 的 html 元素
4. querySelectorAll 與 querySelector 不一樣
5. .forEach 與 .map 的用法
6. Obsidian 在其核心樣式中，會定義一系列以 -- 開頭的 CSS 變數，這些變數可以在 plugin 的 CSS 中使用
7. css box-shadow
8. css transition
9. input:focus-visible
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
