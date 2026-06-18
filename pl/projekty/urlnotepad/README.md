# URL Notepad

A minimalist notepad that stores all content directly in the URL. No server, no database – just copy the link to save your note.

## How it works

Text entered in the editor is compressed using [LZString](https://github.com/pieroxy/lz-string) and stored in the URL hash. The entire note state is contained within the link itself – you can send it to someone or save it as a bookmark.

## Features

- Automatic save to URL on every text change
- LZString compression (~10× smaller size)
- Copy buttons for URL and text
- Runs entirely in the browser (client-side only)

## Technologies

- JavaScript (vanilla)
- LZString – text compression
- History API – URL update without page reload
