/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import perspective from "@finos/perspective";
import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";

// import "./index.less";

window.addEventListener("DOMContentLoaded", async () => {
    const websocket = perspective.websocket("ws://localhost:8081");
    const worker = perspective.shared_worker();
    const server_table = await websocket.open_table("securities_table");
    const server_view = await server_table.view();
    const client_table = await worker.table(server_view, {limit: 10000});

    const viewer = document.querySelector("perspective-viewer");
    viewer.load(client_table);
    let previousTime = new Date().getTime();
    server_view.on_update(() => {
        const currentTime = new Date().getTime();
        // console.log(`Update took ${currentTime - previousTime}ms`);
        previousTime = currentTime;
    });
    viewer.restore({
        plugin: "Y Line",
        columns: ["sample"],
        group_by: ["index"],
        split_by: ["name"]
    });
    // viewer.toggleConfig();
    // const workspace = document.createElement("perspective-workspace");
    // document.body.appendChild(workspace);

    // workspace.tables.set("securities", table);

    // workspace.restore({
    //     detail: {
    //         main: {
    //             type: "split-area",
    //             orientation: "horizontal",
    //             children: [
    //                 {
    //                     type: "tab-area",
    //                     widgets: ["One"],
    //                     currentIndex: 0,
    //                 },
    //                 {
    //                     type: "tab-area",
    //                     widgets: ["Two"],
    //                     currentIndex: 0,
    //                 },
    //             ],
    //             sizes: [0.5, 0.5],
    //         },
    //     },
    //     viewers: {
    //         One: {
    //             table: "securities",
    //             name: "Heat Map",
    //             plugin: "heatmap",
    //             group_by: ["client"],
    //             columns: ["chg"],
    //             split_by: '["name"]',
    //         },
    //         Two: {
    //             table: "securities",
    //             name: "Bar Chart",
    //             plugin: "X Bar",
    //             group_by: ["client"],
    //             columns: ["chg"],
    //         },
    //     },
    // });

    // window.workspace = workspace;
});
