import { execSync } from 'child_process';
import path = require('path');
import * as vscode from 'vscode';

import * as copy from 'copy-paste';

// Priority order:
const GREP_COMMANDS = [
	"rg -Hn",
	"git grep -Hn",
	"grep -Hnr --binary-files=without-match",
];

const GREP_RESULT_PATTERN = /^([^:]+):(\d+):/;

class GrepResult extends vscode.TreeItem {
	private path: string;
	private line: number;
	private cwd: string;

	constructor(label: string, cwd: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.label = label;

		this.cwd = cwd;

		const match = GREP_RESULT_PATTERN.exec(label);
		this.path = match![1];
		this.line = parseInt(match![2]);

		this.tooltip = `${this.path}:${this.line}`;
	}

	public activate(): void {
		vscode.workspace.openTextDocument(path.join(this.cwd, this.path))
			.then(document => {
				vscode.window.showTextDocument(document)
					.then(editor => {
						const position = new vscode.Position(this.line - 1, 0);
						editor.selection = new vscode.Selection(position, position);
						editor.revealRange(new vscode.Range(position, position));
					});
			});
	}
}

class GrepResultsTree implements vscode.TreeDataProvider<GrepResult> {
	private treeView: undefined | vscode.TreeView<GrepResult>;
	private items: GrepResult[];
	private _onDidChangeTreeData: vscode.EventEmitter<GrepResult | undefined | null | void> = new vscode.EventEmitter<GrepResult | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<GrepResult | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {
		this.treeView = vscode.window.createTreeView("grepResults", {"treeDataProvider": this});
		this.items = [];
		this.treeView.onDidChangeSelection((event) => {
			event.selection[0].activate();
		});
	}

	getTreeItem(element: GrepResult): vscode.TreeItem | Thenable<vscode.TreeItem> {
		return element;
	}

	getChildren(element?: GrepResult | undefined): vscode.ProviderResult<GrepResult[]> {
		return this.items;
	}
	
	getParent(element: GrepResult): vscode.ProviderResult<GrepResult> {
		return null;
	}

	setResults(results: GrepResult[]): void {
		this.items = results;
		this._onDidChangeTreeData.fire();
	}

	clearResults(): void {
		this.items.length = 0;
		this._onDidChangeTreeData.fire();
	}

	dispose(): void {
		this.treeView?.dispose();
		this.treeView = undefined;
	}

	show(): void {
		if (this.items.length > 0) {
			// Set select to false, else we'll jump right to the first result
			// and that can be quite disorientating.
			this.treeView?.reveal(this.items[0], {select: false, focus: true});
		}
	}
}

let grepResults: undefined | GrepResultsTree;
let lastGrepOutput: undefined | string;

function clearResults(): void {
	grepResults?.clearResults();
	lastGrepOutput = undefined;
}

function grepExec(query: string): GrepResult[] {
	let cwd: string;

	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (workspaceFolders) {
		cwd = workspaceFolders[0].uri.fsPath;
	} else {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return [];
		}

		cwd = path.dirname(editor.document.uri.fsPath);
	}

	let cmdIndex = 0;
	let anyRan = false;
	for (let cmdIndex = 0; cmdIndex < GREP_COMMANDS.length; ++cmdIndex) {
		try {
			const grepCmd = GREP_COMMANDS[cmdIndex];
			const grepOutput = execSync(`${grepCmd} ${query} .`, {cwd: cwd, maxBuffer: 10 * 1024 * 1024});
			lastGrepOutput = grepOutput.toString();
			return lastGrepOutput
				.split('\n')
				.filter(v => v.match(GREP_RESULT_PATTERN))
				.map(v => new GrepResult(v, cwd));
		}
		catch (e: any) {
			// An exit status of 1 means the command ran, but produced no
			// results.  Differentiate between that happening and the case where
			// no greps were executed successfully.
			if (e.status === 1) {
				anyRan = true;
			}
		}
	}

	if (!anyRan) {
		vscode.window.showErrorMessage("Failed to run any grep command.");
	}

	return [];
}

function doGrep(query: string): void {
	grepResults?.setResults(grepExec(query));
	grepResults?.show();
}

function getSelectedText(): string | undefined {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return undefined;
	}

	const selection = editor.selection;
	if (selection.isEmpty) {
		return undefined;
	}

	return editor.document.getText(selection);
}

function getWordAtCursor(): string | undefined {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return undefined;
	}

	const document = editor.document;
	const selection = editor.selection;
	const wordRange = document.getWordRangeAtPosition(selection.start);

	if (wordRange) {
		return editor.document.getText(wordRange);
	}

	return undefined;
}

function escapeRegExp(inputString: string): string {
    return inputString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function doGrepQuery(): void {
	let val = '';

	const selected = getSelectedText();
	if (selected) {
		val = `-- "${escapeRegExp(selected)}"`;
	} else {
		const word = getWordAtCursor();
		if (word) {
			val = `-- "\\b${escapeRegExp(word)}\\b"`;
		}
	}

	vscode.window.showInputBox({
		placeHolder: 'Grep query',
		value: val
	}).then(query => {
		if (query) {
			doGrep(query);
		}
	});
}

function copyResults(): void {
	if (lastGrepOutput) {
		copy.copy(lastGrepOutput);
		vscode.window.showInformationMessage('Results copied to clipboard.');
	}
}

export function activate(context: vscode.ExtensionContext) {
	grepResults = new GrepResultsTree();

	let commands = [
		vscode.commands.registerCommand('grep-panel.grep', doGrepQuery),
		vscode.commands.registerCommand('grep-panel.clear', clearResults),
		vscode.commands.registerCommand('grep-panel.copy-results', copyResults),
	];

	commands.forEach((cmd) => context.subscriptions.push(cmd));
}

export function deactivate() {
	grepResults?.dispose();
	grepResults = undefined;
}
