var term = require("ringo/term");
var assert = require("assert");
var {Worker} = require("ringo/worker");
var {Semaphore} = require("ringo/concurrent");

var {Store, Cache, ConnectionPool} = require("../lib/sqlstore/main");
var sqlUtils = require("../lib/sqlstore/util");

var store = null;
var connectionPool = null;
var Author = null;
var maxAuthors = 1000;

var MAPPING_AUTHOR = {
    // "schema": "TEST",
    "table": "author",
    "id": {
        "column": "author_id",
        "sequence": "author_id"
    },
    "properties": {
        "name": {
            "type": "string",
            "column": "author_name",
            "nullable": false
        }
    }
};

exports.setUp = function(dbProps) {
    connectionPool = Store.initConnectionPool(dbProps);
    store = new Store(connectionPool);
    term.writeln("------------------------------");
    term.writeln("Using", store.connectionPool.getDriverClass());
    Author = store.defineEntity("Author", MAPPING_AUTHOR);
    store.syncTables();
    store.beginTransaction();
    for (let i=0; i<maxAuthors; i+=1) {
        (new Author({"name": "Author " + i})).save();
    }
    store.commitTransaction();
    // assert.strictEqual(Author.all().length, maxAuthors);
    term.writeln("Inserted", maxAuthors, "rows");
};

exports.tearDown = function() {
    var conn = store.getConnection();
    [Author].forEach(function(ctor) {
        var schemaName = ctor.mapping.schemaName || store.dialect.getDefaultSchema(conn);
        if (sqlUtils.tableExists(conn, ctor.mapping.tableName, schemaName)) {
            sqlUtils.dropTable(conn, store.dialect, ctor.mapping.tableName, schemaName);
            if (ctor.mapping.id.hasSequence() && store.dialect.hasSequenceSupport()) {
                sqlUtils.dropSequence(conn, store.dialect, ctor.mapping.id.sequence, schemaName);
            }
        }
    });
    store.close();
};

exports.start = function(cnt, maxWorkers) {
    cnt || (cnt = 100);
    maxWorkers = maxWorkers || (maxWorkers = 10);

    var semaphore = new Semaphore();
    var workers = new Array(maxWorkers);
    var workerMillis = new Array(maxWorkers);
    var workerMsPerQuery = new Array(maxWorkers);
    for (let i=0; i<maxWorkers; i+=1) {
        var worker = new Worker(module.resolve("./query.concurrent.worker"));
        worker.onmessage = function(event) {
            workerMillis[event.data.workerNr] = event.data.millis;
            workerMsPerQuery[event.data.workerNr] = event.data.msPerQuery;
            semaphore.signal();
        };
        worker.onerror = function(event) {
            term.writeln(term.RED, "Worker error", event.data.toSource(), term.RESET);
            semaphore.signal();
        };
        workers[i] = worker;
    }
    term.writeln("Setup", maxWorkers, "workers");

    var queryCache = new Cache(10000);
    workers.forEach(function(worker, idx) {
        worker.postMessage({
            "workerNr": idx,
            "maxAuthors": maxAuthors,
            "connectionPool": connectionPool,
            "queryCache": queryCache,
            "cnt": cnt
        }, true);
    });
    semaphore.wait(maxWorkers);
    term.writeln(maxWorkers, "workers finished");
    var workerMillisAvg = workerMillis.reduce(function(prev, current) {
            return prev + current;
        }, 0) / maxWorkers;
    var millisPerQuery = workerMillisAvg / cnt;
    var queriesPerSec = (1000 / millisPerQuery).toFixed(2);
    term.writeln(term.GREEN, maxWorkers, "workers,", cnt, "queries/worker,",
            millisPerQuery.toFixed(2) + "ms/query,", queriesPerSec, "queries/sec", term.RESET);
    //term.writeln("----------- AVG:", workerMillisAvg.toFixed(2));
/*
    workerMsPerQuery.forEach(function(arr, idx) {
        console.log("Worker", idx, arr, "=> avg", arr.reduce(function(prev, current) {
            return prev + current;
        }, 0) / arr.length);
    });
*/
};
