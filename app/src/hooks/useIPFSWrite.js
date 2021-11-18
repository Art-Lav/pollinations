
 
import {useCallback, useEffect, useMemo, useReducer, useState} from "react";
import { updateInput, getWriter } from "../network/ipfsWebClient";

import Debug from "debug";

const debug = Debug("useIPFSWrite");

export default (ipfs, node) => {

    const { publish } = node;
    
    const cid = ipfs && ipfs[".cid"];

    const writer = useMemo(() => {
        if (!cid)
            return;
        return getWriter(ipfs);
    }, [cid]);

    debug("inputCID", cid, writer);

    const dispatch = useCallback(async inputState => {
        
        debug("dispatching", ipfs, writer)
        const newContentID = await updateInput(await writer, inputState);

        debug("added input", inputState, "got cid", newContentID, "to state");

        publish(newContentID);

        return newContentID;
        
    }, [publish, writer, ipfs]);

    return dispatch;
}