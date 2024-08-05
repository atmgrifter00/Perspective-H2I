import { getTable } from "./datasources/securities.js";
import perspective from "@finos/perspective";

const host = new perspective.WebSocketServer({port: 8081});
getTable().then((table) => {
    host.host_table("securities_table", table);
    (async () => {
        const view = await table.view();
        let previousTime = new Date().getTime();
        view.on_update(updated => {
            const currentTime = new Date().getTime();
            console.log('delta: ' + updated.delta);
            previousTime = currentTime;
        }, {mode: "row"});
    })();
});
