import watch from 'file-watch-iterator';
import { writer } from "../../network/ipfsConnector.js";
import { publisher } from "../../network/ipfsPubSub.js";
import { join } from "path";
import { existsSync, mkdirSync } from 'fs';
import Debug from 'debug';
import { sortBy, reverse } from "ramda";

const debug = Debug("ipfs/sender");

export const sender = async (client, { path: watchPath, debounce, ipns, once }) => {
  
  let processing = Promise.resolve(true);
  
  const { addFile, mkDir, rm, cid, close } = await writer(client);

  async function start() {

    if (!existsSync(watchPath)) {
      debug("Local: Root directory does not exist. Creating", watchPath);
      mkdirSync(watchPath, { recursive: true });
    }
    
    debug("Local: Watching", watchPath);
    
    const watch$ = watch(".", {
      ignored: /(^|[\/\\])\../,
      cwd: watchPath,
      awaitWriteFinish: true,
    }, { debounce });
    
    // const { publish, close } = publisher(null,"/output");

    for await (const files of watch$) {
      
      let done=null;

      processing = new Promise(resolve => done = resolve);
      
      const changed = getSortedChangedFiles(files);
      
      // Using sequential loop for now just in case parallel is dangerous with Promise.ALL
      for (const { event, file } of changed) {
        debug("Local:", event, file);
        const localPath = join(watchPath, file);
        const ipfsPath = file;

        if (event === "addDir") {
          await mkDir(ipfsPath);
        }

        if (event === "add" || event === "change") {
          await addFile(ipfsPath, localPath);
        }

        if (event === "unlink" || event === "unlinkDir") {
          debug("removing", file, event);
          await rm(ipfsPath);
        }
      }

      // await Promise.all(changed.map(async ({ event, file }) => {
     

      // }));
  
      const newContentID = await cid();
      console.log(newContentID);
      if (ipns) {
        debug("publish", newContentID);
        // if (!isSameContentID(stringCID(newContentID)))
        await publish(newContentID);
      }

      done();

      if (once) {
        break;
      }
    }
    close();
  }
  return {start, processing: () => processing};
};



function getSortedChangedFiles(files) {
  const changed = files.toArray()
    .filter(({ changed, file }) => changed && file.length > 0)
    .map(({ changed, ...rest }) => rest);
  const changedOrdered = order(changed);
  debug("Changed files", changedOrdered);
  return changedOrdered;
}


// TODO: check why unlink is twice in ordering
const _eventOrder = ["unlink", "addDir", "add", "unlink", "unlinkDir"];//.reverse();
const eventOrder = ({ event }) => _eventOrder.indexOf(event);

const order = events => sortBy(eventOrder, reverse(events));
