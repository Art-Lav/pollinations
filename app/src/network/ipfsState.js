

import client, { globSource, nodeID, getCID, stringCID, ipfsLs, ipfsMkdir, ipfsAdd } from "./ipfsConnector.js";
import Debug from "debug";
import { toPromise } from "./utils.js";
import { zip } from "ramda";
import { cacheOutput } from "./contentCache.js";

const debug = Debug("ipfsState");


export const getIPFSState = (contentID, processFile) => {
    debug("Getting state for CID", contentID)
    return _getIPFSState({ cid: contentID, name:".", type: "dir" }, processFile)
}

const _getIPFSState = cacheOutput(async ({ cid, type, name }, processFile) => {
    cid = stringCID(cid);
    debug("Getting state for", type, name, cid);
    if (type === "dir") {
        const files = await ipfsLs(cid);
        debug("Got files for", name, cid, files);
        const filenames = files.map(({ name }) => name);
        const contents = await Promise.all(files.map(
            file => _getIPFSState(file, processFile)
        ));
        return Object.fromEntries(zip(filenames, contents));
    
    }
     

    if (type === "file") {
        const fileResult = await processFile({ cid, name });
        return fileResult;
    }

    throw `Unknown file type "${type}" encountered. Name: "${name}", CID: "${cid}".`;
});





async function _cacheIPFSPath(ipfsPath, content={}) {
    debug("cacheIpfsPath", ipfsPath, " Content:", content)
    const cid = await getCID(ipfsPath);
    contentCache.set(cid, content);
    return content;
}



// export const  ipfsAddFileCached = (localPath, ipfsPath=null) => {
//     return await addCached(globSource(localPath), ipfsPath);
// }

export async function ipfsAddCached(source, ipfsPath=null) {
    const cid = await ipfsAdd(source);
    
    contentCache.set(cid, content);
    await _cacheIPFSPath(ipfsPath, source);
    return cid.toString();
};


    
// export const cacheGet = cid =>
//     contentCache.get(cid);