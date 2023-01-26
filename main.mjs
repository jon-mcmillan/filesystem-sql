let dirHandle = null;
let fsDirHandle = null;
let fileHandle = null;
const id = "simrex-id";

let _callbacks = {};

const worker = new Worker("/wasm/worker.sql-wasm.js");

/**
 * @param {import('sql.js').QueryExecResult} result
 */
const writeTable = (result) => {
  const str = `<table>
  <thead>
    <tr>
      ${result.columns.map((col) => `<th>${col}</th>`).join("")}
      </tr>
  </thead>
  <tbody>
    ${result.values
      .map((row) => `<tr>${row.map((col) => `<td>${col}</td>`).join("")}</tr>`)
      .join("")}
  </tbody>
</table>`;

  document.querySelector("#db").innerHTML = str;
};

const loadFile = async (name) => {
  fileHandle = await fsDirHandle.getFileHandle(name);
  await openDatabase(fileHandle);
};

const writeFiles = (files) => {
  const ul = document.createElement("ul");
  for (const file of files) {
    const li = document.createElement("li");
    li.textContent = file;
    if (file.endsWith(".db")) {
      const button = document.createElement("button");
      button.textContent = "Open";
      button.addEventListener("click", () => loadFile(file));
      li.append(button);
    }
    ul.append(li);
  }

  document.querySelector("#files").replaceChildren(ul);
};

worker.onmessage = (event) => {
  console.log(event);
  if (event.data.id == null) {
    console.warn("No id in message", event);
    return;
  }

  const callback = _callbacks[event.data.id];
  if (!callback) {
    console.warn("No callback for id", event.data.id);
    return;
  }

  delete _callbacks[event.data.id];
  callback(event.data);
};

let messageId = 0;

const postMessage = (message) => {
  return new Promise((resolve, reject) => {
    const id = messageId++;
    _callbacks[id] = (message) => {
      if (message.error) {
        reject(message.error);
      } else {
        resolve(message);
      }
    };

    worker.postMessage({
      ...message,
      id,
    });
  });
};

const listFiles = async () => {
  if (!fsDirHandle) {
    fsDirHandle = await window.showDirectoryPicker({
      id,
      startIn: "downloads",
    });
  }

  let files = [];
  const entries = await fsDirHandle.entries();
  for await (const [name, handle] of entries) {
    if (handle.kind === "file") {
      files.push(name);
    }
  }
  document.querySelector("#file-actions").style.display = "block";
  writeFiles(files);
};

const createNewDatabase = async () => {
  if (!fsDirHandle) {
    await listFiles();
  }

  fileHandle = await window.showSaveFilePicker({
    types: [
      {
        description: "SQLite Database",
        suggestedName: "test.db",
        accept: {
          "application/x-sqlite3": [".db"],
        },
      },
    ],
  });

  await openDatabase(fileHandle);
};

async function openDatabase(handle) {
  let buffer = undefined;
  if (handle) {
    const file = await handle.getFile();
    const ab = await file.arrayBuffer();
    buffer = new Uint8Array(ab);
  }
  await postMessage({
    action: "open",
    buffer,
  });
  document.querySelector("#db-actions").style.display = "block";

  await postQuery("CREATE TABLE IF NOT EXISTS test (aColumnName TEXT)");

  writeTable(await postQuery("SELECT * FROM sqlite_schema"));
}

const loadOPFS = async () => {
  dirHandle = await navigator.storage.getDirectory();
  fileHandle = await dirHandle.getFileHandle("test.db", { create: true });

  await openDatabase(fileHandle);
};

const postQuery = async (query) => {
  const message = await postMessage({
    action: "exec",
    sql: query,
  });

  return message.results[0];
};

// Reads from the test table and displays the rows in a table
const readTable = async () => {
  writeTable(await postQuery("SELECT * FROM test"));
};

// Add a row to the test table and refresh the table
let rowId = 0;
const addRow = async () => {
  await postQuery(`INSERT INTO test VALUES ('WEB ${rowId++}')`);
  await readTable();
};

// save the database back to the file system
const save = async () => {
  const { buffer } = await postMessage({
    action: "export",
  });

  const writable = await fileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();
};

document.querySelector("#load").addEventListener("click", listFiles);
document.querySelector("#load-opfs").addEventListener("click", loadOPFS);
document
  .querySelector("#create-new-db")
  .addEventListener("click", createNewDatabase);
document.querySelector("#add-row").addEventListener("click", addRow);
document.querySelector("#read-table").addEventListener("click", readTable);
document.querySelector("#save").addEventListener("click", save);
