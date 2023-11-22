# Grep Panel for VS Code

![Grep Panel](images/icon.png)

Grep Panel is a Visual Studio Code extension for executing grep searches and
keeping the results in a panel to browse through and visit.

Three different types of grep are tried in the following order:

1. `rg`: [ripgrep](https://github.com/BurntSushi/ripgrep)
2. `git grep`: [Git Grep](https://git-scm.com/docs/git-grep)
3. `grep`: Traditional grep

Whichever succeeds first is used and they're ordered this way from fastest to
slowest.

## Installation

Install through the Visual Studio Code Marketplace:
https://marketplace.visualstudio.com/items?itemName=chrisjdavies.grep-panel

## Screenshot

![Screenshot](images/screenshot.png)

## Commands

Grep Panel adds the following commands to the command palette:

- Grep Panel: Grep...
- Grep Panel: Copy Results
- Grep Panel: Clear Results

For the _Grep..._ command, the query box is populated with either:

- the selected text, or
- the word at the cursor if no text is selected.

You will notice that the format of the query includes `-- "..."`.  This is
because the text is used directly in the command invocation to allow extra flags
to be passed (e.g. `-i`).  Consequently, if you want to include spaces in your
pattern, you should surround your query with quotes: e.g. `"hello, world"`.

## Thanks

- Thanks to [ripgrep](https://github.com/BurntSushi/ripgrep) for being an
  amazingly fast drop-in for `grep`.
- Thanks to [vim-ripgrep](https://github.com/jremmen/vim-ripgrep) for the
  inspiration.  I use this all the time in vim and miss it in VS Code.
- Thanks to DALL-E 3 for generating the icon/logo.
