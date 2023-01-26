import "./style.css";
import initSqlJs, {
  Database,
  QueryExecResult,
  SqlJsStatic,
} from "sql.js/dist/sql-wasm.js";

let dirHandle: FileSystemDirectoryHandle | null = null;
let fileHandle: FileSystemFileHandle | null = null;
let SQL: SqlJsStatic;
let DB: Database;
const id = "simrex-id";

const writeTable = (result: QueryExecResult) => {
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

  document.querySelector<HTMLDivElement>("#db")!.innerHTML = str;
};

const loadDatabase = async () => {
  if (!dirHandle) {
    dirHandle = await window.showDirectoryPicker({
      id,
      startIn: "downloads",
    });
  }

  const entries = await dirHandle.entries();
  for await (const [name, handle] of entries) {
    if (handle.kind === "file" && name.endsWith(".db")) {
      fileHandle = handle;
      const file = await handle.getFile();
      const ab = await file.arrayBuffer();
      const buffer = new Uint8Array(ab);

      DB = new SQL.Database(buffer);
      const tables = DB.exec("SELECT * FROM sqlite_schema").at(0);
      tables && writeTable(tables);
    }
  }
};

const createTable = async () => {
  if (!DB) {
    return;
  }

  DB.run("CREATE TABLE test (name TEXT)");
};

// Reads from the test table and displays the rows in a table
const readTable = async () => {
  if (!DB) {
    return;
  }

  const result = DB.exec("SELECT * FROM test");
  result && writeTable(result.at(0));
};

// Add a row to the test table and refresh the table
const addRow = async () => {
  if (!DB) {
    return;
  }

  DB.run("INSERT INTO test VALUES ('test from the website')");
  readTable();
};

// save the database back to the file system
const save = async () => {
  if (!fileHandle || !DB) {
    return;
  }

  const writable = await fileHandle.createWritable();
  await writable.write(DB.export());
  await writable.close();
};

const setupSql = async () => {
  SQL = await initSqlJs({
    locateFile: () => `/sql-wasm.wasm`,
  });
};

document
  .querySelector<HTMLButtonElement>("#load")
  ?.addEventListener("click", loadDatabase);

document
  .querySelector<HTMLButtonElement>("#create-table")
  ?.addEventListener("click", createTable);

document
  .querySelector<HTMLButtonElement>("#add-row")
  ?.addEventListener("click", addRow);

document
  .querySelector<HTMLButtonElement>("#read-table")
  ?.addEventListener("click", readTable);

document
  .querySelector<HTMLButtonElement>("#save")
  ?.addEventListener("click", save);
setupSql();
