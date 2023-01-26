import "./style.css";
import initSqlJs, { SqlJsStatic } from "sql.js/dist/sql-wasm.js";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h1>File System Access API</h1>
    <div class="card">
      <button id="counter" type="button">Get Access</button>
      <button id="download" type="button">Download</button>
    </div>
    <div>
      <h2>Database</h2>
      <div id="db"></div>
    </div>
  </div>
`;

let dirHandle: FileSystemDirectoryHandle | null = null;
let SQL: SqlJsStatic;
const id = "simrex-id";

const requestPermission = (button: HTMLButtonElement) => {
  button.addEventListener("click", async () => {
    if (!dirHandle) {
      dirHandle = await window.showDirectoryPicker({
        id,
        startIn: "downloads",
      });
    }

    const entries = await dirHandle.entries();
    for await (const [name, handle] of entries) {
      if (handle.kind === "file") {
        if (name.endsWith(".db")) {
          const file = await handle.getFile();
          const ab = await file.arrayBuffer();
          const buffer = new Uint8Array(ab);

          const db = new SQL.Database(buffer);
          const tables = db.exec("SELECT * FROM sqlite_schema").at(0);
          const str = `<table>
            <thead>
              <tr>
                ${tables.columns.map((col) => `<th>${col}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
              ${tables.values
                .map(
                  (row) =>
                    `<tr>${row.map((col) => `<td>${col}</td>`).join("")}</tr>`
                )
                .join("")}
            </tbody>
          </table>`;
          document.querySelector<HTMLDivElement>("#db")!.innerHTML = str;
          console.log(db.exec("SELECT * FROM sqlite_schema"));
        }
      }
    }
  });
};

const setupDownload = (button: HTMLButtonElement) => {
  button.addEventListener("click", async () => {
    if (!dirHandle) {
      return;
    }

    const fileHandle = await dirHandle.getFileHandle("test.txt", {
      create: true,
    });

    const writable = await fileHandle.createWritable();
    await writable.write("Hello World");
    await writable.close();
  });
};

const setupSql = async () => {
  SQL = await initSqlJs({
    locateFile: (file) => `/sql-wasm.wasm`,
  });
};

requestPermission(document.querySelector<HTMLButtonElement>("#counter")!);
setupDownload(document.querySelector<HTMLButtonElement>("#download")!);
setupSql();
