// tslint:disable:no-use-before-declare

import * as simplegit from 'simple-git/promise';
import * as jsonforms from '@jsonforms/core';
import * as cp from 'child_process';
import { readFile, writeFile } from 'fs';
import * as Ajv from 'ajv';
import { sep } from 'path';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/*
 * Receives the data from the editor and calls the install methos
 * @param {string} editorInstance the instance of the editor
 * @param {string} args the arguments passed to the editor call
 * @param {function} project the project, that should be installed
 */
export const createProject = (editorInstance: any, args: any, project: string) => {
  if (!args) {
    editorInstance.window.showOpenDialog(editorInstance.OpenDialogOptions = {
      canSelectMany: false,
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: 'Select folder',
    }).then((fileUri: any) => {
      if (fileUri && fileUri[0].fsPath) {
        asyncCreateProject(editorInstance, fileUri[0].fsPath, project);
      } else {
        showMessage(editorInstance, 'Please select a empty folder', 'err');
        return;
      }
    });
  } else {
    asyncCreateProject(editorInstance, args.fsPath, project);
  }
};

/**
 * Generates the default UI Schema from a json schema
 * @param {string} path path to the json schema file
 * @param {function} callback forwards the current status to the caller
 */
export const generateUISchema = (editorInstance: any, args: any) => {
  if (!args) {
    editorInstance.window.showOpenDialog(editorInstance.OpenDialogOptions = {
      canSelectMany: false,
      canSelectFolders: false,
      canSelectFiles: true,
      openLabel: 'Select schema',
      filters: {
        'Json Files': ['json'],
      },
    }).then((fileUri: any) => {
      if (fileUri && fileUri[0].fsPath) {
        asyncGenerateUiSchema(editorInstance, fileUri[0].fsPath);
      } else {
        showMessage('Please select a json schema file', 'err');
        return;
      }
    });
  } else {
    asyncGenerateUiSchema(editorInstance, args.fsPath);
  }
};

const asyncGenerateUiSchema = (editorInstance: any, path: string) => {
  editorInstance.window.showInputBox(editorInstance.InputBoxOptions = {
    prompt: 'Label: ',
    placeHolder: 'Enter a filename for your UI Schema (default: ui-schema.json)',
  }).then((name: string) => {
    let fileName = name;
    if (!fileName) {
      fileName = 'ui-schema.json';
    }
    showMessage(editorInstance, `Generating UI Schema: ${path}`);
    // Read JSON Schema file
    readFile(path, 'utf8', (readError, data) => {
      if (readError.message) {
        showMessage(editorInstance, readError.message, 'err');
        return;
      }

      const jsonSchema = JSON.parse(data);
      validateJSONSchema(jsonSchema, (validateError?: string) => {
        if (validateError) {
          showMessage(editorInstance, validateError, 'err');
          return;
        }

        const jsonUISchema = jsonforms.generateDefaultUISchema(jsonSchema);

        // Check if windows or linux filesystem
        let newPath = path.substring(0, path.lastIndexOf(sep));
        newPath = newPath + sep + name;

        // Write UI Schema file
        writeFile(newPath, JSON.stringify(jsonUISchema, null, 2), writeError => {
          if (writeError.message) {
            showMessage(editorInstance, writeError.message, 'err');
            return;
          }
          showMessage(editorInstance, 'Successfully generated UI schema');
        });
      });
    });
  });
};

/**
 * Validate a given JSON Schema
 * @param {string} path path to the json schema file
 * @param {function} callback forwards the current status to the caller
 */
const validateJSONSchema = (schema: Object, callback: (err?: string) => void) => {
  const ajv = new Ajv();
  try {
    ajv.compile(schema);
    callback();
  } catch (error) {
    callback(error.message);
  }
};

/**
 * Show Visual Studio Code Message
 * @param {string} message the message that should be displayed
 * @param {string} type the type of the message
 */
const showMessage = (editorInstance: any, message: string, type?: string) => {
  switch (type) {
    case 'err':
      editorInstance.window.showErrorMessage(message);
      break;
    case 'war':
      editorInstance.window.showWarningMessage(message);
      break;
    default:
      editorInstance.window.showInformationMessage(message);
  }
};

/**
 * Async Creating Project
 * @param {string} path the path to the project folder
 * @param {string} type the path to the project folder
 */
const asyncCreateProject = (editorInstance: any, path: string, project: string) => {
  let url = '';
  switch (project) {
    case 'example':
      url = 'https://github.com/eclipsesource/make-it-happen-react';
      break;
    case 'seed':
      url = 'https://github.com/eclipsesource/jsonforms-react-seed';
      break;
    default:
      return;
  }

  if (project === 'example') {
    showMessage(editorInstance, `Creating example project: ${path}`);
    cloneAndInstall(editorInstance, url, path);
    return;
  }

  editorInstance.window.showInputBox(editorInstance.InputBoxOptions = {
    prompt: 'Label: ',
    placeHolder: `Enter a name for your ${project} project`,
  }).then((name: any) => {
    let projectName = name;
    if (!name) {
      projectName = `jsonforms-${project}`;
    } else {
      showMessage(editorInstance, `Creating ${project} project: ${path}`);
      cloneAndInstall(editorInstance, url, path, projectName);
    }
  });
};

/**
 * Async Clone And Install
 * @param {string} path the path to the project folder
 * @param {string} type the path to the project folder
 */
const cloneAndInstall = (editorInstance: any, url: string, path: string, projectName?: string) => {
  const git = simplegit();
  git.clone(url, path)
    .then(() => {
      showMessage(editorInstance, 'Finished to clone repo');
      showMessage(editorInstance, 'Running npm install');
      const result = cp.spawnSync(npm, ['install'], {
        cwd: path,
      });
      showMessage(editorInstance, result.signal);
    })
    .catch((err: any) => { showMessage(editorInstance, err.message, 'err'); });
};
