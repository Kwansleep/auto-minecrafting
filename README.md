# auto-minecrafting
offline minecraft automation bots using mineflayer writtin in typescript

project was developed in vscode

## Usage
complie ./src into javascript and run 
```
node pbuild.js
```

Example launch.json
```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "sourceMaps": true,
      "request": "launch",
      "name": "Launch Program",
      "skipFiles": [
        "<node_internals>/**"
      ],
      "program": "${workspaceFolder}/dist/pbuild.js",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": [
        "${workspaceFolder}/dist/**/*.js"
      ],
      "console": "integratedTerminal",
      "pauseForSourceMap": true
    }
  ]
}
```

Example task.json
```
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "typescript",
      "tsconfig": "tsconfig.json",
      "option": "watch",
      "problemMatcher": [
	"$tsc-watch"
      ],
      "group": {
	"kind": "build",
	"isDefault": true
      },
      "label": "tsc: watch - tsconfig.json"
    }
  ]
}
```
