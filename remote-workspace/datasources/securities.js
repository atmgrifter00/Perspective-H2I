import { tableFromArrays, vectorFromArray } from "apache-arrow";
import perspective from "@finos/perspective";

const worker = perspective.shared_worker
    ? perspective.shared_worker()
    : perspective;

// Cache updates for faster update rates (but less data diversity)>
const CACHE_INPUT = false;

// If cached, how many updates to cache?
const CACHE_ENTRIES = 200;

// How many rows per update?
const UPDATE_SIZE = 50;

// Update every N milliseconds
const TICK_RATE = 30;

// Size limit of the server-side table
const TABLE_SIZE = 10000;

const CHANNELS = 4;

const SAMPLE_SIZE = 20000;

const SECURITIES = [
    "AAPL.N",
    "AMZN.N",
    "QQQ.N",
    "NVDA.N",
    "TSLA.N",
    "FB.N",
    "MSFT.N",
    "TLT.N",
    "XIV.N",
    "YY.N",
    "CSCO.N",
    "GOOGL.N",
    "PCLN.N",
];
const CLIENTS = [
    "Homer",
    "Marge",
    "Bart",
    "Lisa",
    "Maggie",
    "Moe",
    "Lenny",
    "Carl",
    "Krusty",
];

const __CACHE__ = [];

// perspective.initialize_profile_thread();

/*******************************************************************************
 *
 * Slow mode (new rows generated on the fly)
 */

function choose(choices) {
    return choices[Math.floor(Math.random() * choices.length)];
}

function newRows() {
    const rows = [];
    for (let i = 0; i < CHANNELS; i++) {
        for (let x = 0; x < SAMPLE_SIZE; x++) {
            rows.push({
                name: (i + 1).toString(),
                sample: Math.random() * 20 - 10 + (i * 10),
                index: x
            });
        }
    }

    const samples = Float32Array.from({length: SAMPLE_SIZE * CHANNELS}, (_, i) => Math.random() * 20 - 10 + (i / SAMPLE_SIZE * 10));
    const indices = Int32Array.from({length: SAMPLE_SIZE * CHANNELS}, (_, i) => i);
    const names = vectorFromArray(Array.from({length: SAMPLE_SIZE * CHANNELS}, (_, i) => i.toString()));
    return tableFromArrays({
        name: names,
        sample: samples,
        index: indices
    });
    // return rows;
}

async function init_dynamic({table_size, update_size, tick_rate}) {
    // Create a `table`.
    const schema = {
        name: "string",
        sample: "float",
        index: "integer"
    };
    const table = await worker.table(schema, {limit: table_size});

    // The `table` needs to be registered to a name with the Perspective
    // `WebSocketServer` in order for the client to get a proxy handle to it.

    // Loop and update the `table` oocasionally.
    let previousTime = new Date().getTime();
    (function postRow() {
        const currentTime = new Date().getTime();
        table.replace(newRows());
        setTimeout(postRow, tick_rate);
        // console.log(`Update took ${currentTime - previousTime}ms`);
        previousTime = currentTime;
    })();
    return table;
}

/*******************************************************************************
 *
 * Fast mode (rows pre-generated, cached as Arrows)
 */

async function newArrow(total_rows) {
    const table = await worker.table(newRows());
    const vw = await table.view();
    const arrow = await vw.to_arrow();
    vw.delete();
    table.delete();
    return arrow;
}

async function populate_cache(cache_entries) {
    for (let x = 0; x < cache_entries; x++) {
        let arrow = await newArrow(SAMPLE_SIZE * CHANNELS);
        __CACHE__[x] = arrow;
    }
}

async function init_cached({table_size, tick_rate, cache_entries}) {
    await populate_cache(cache_entries);
    const table = await worker.table(newRows(), {limit: table_size});
    (function postRow() {
        const entry = __CACHE__[Math.floor(Math.random() * __CACHE__.length)];
        table.update(entry);
        setTimeout(postRow, tick_rate);
    })();
    return table;
}

const getTable = (
    config = {
        cached: CACHE_INPUT,
        tick_rate: TICK_RATE,
        update_size: UPDATE_SIZE,
        table_size: CHANNELS * SAMPLE_SIZE,
        cache_entries: CACHE_ENTRIES,
    }
) => {
    if (config.cached) {
        return init_cached(config);
    } else {
        return init_dynamic(config);
    }
};

export { getTable };