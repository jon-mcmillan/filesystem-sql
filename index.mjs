window.addEventListener("load", async () => {
  // ask for permission to the ~/Downloads folder
  // (or whatever folder you want to save to)
  const [fileHandle] = await window.showOpenFilePicker();
  if (fileHandle.kind === "directory") {
    const dirHandle = fileHandle;
    const file = await dirHandle.getFile("test.txt", { create: true });
    const writable = await file.createWritable();
    await writable.write("Hello World!");
    await writable.close();
    const div = document.createElement("div");
    div.innerText = "File written to " + file.name;
    document.body.append(div);
  }
});
