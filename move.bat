set src="E:\E_codes\obsidian-plugin\.obsidian\plugins\obsidian-filex"
set dst="F:\Data0831\.obsidian\plugins\obsidian-filex"

xcopy %src%\manifest.json %dst% /i /y
xcopy %src%\main.js %dst% /i /y
xcopy %src%\styles.css %dst% /i /y
pause