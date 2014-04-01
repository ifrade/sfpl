#!/usr/bin/env node
var SFPL = require('../lib/sfpl.js');
var async = require('async');
var minimist = require('minimist');
var fs = require('fs');

/* Load user name and pin from configuration file */
var CONFIG_FILE = __dirname + '/sfpl.config.json';
if (!fs.existsSync(CONFIG_FILE)) {
    console.log("User and pin should be set in", CONFIG_FILE);
    process.exit(-1);
}

var config = JSON.parse(fs.readFileSync(CONFIG_FILE).toString());
if (!config ||
    !config.user || config.user.length !== 14 ||
    !config.pin || config.pin.length !== 4) {
    console.log("Contents of sfpl.config.json don't look right", config);
    process.exit(-1);
}


/* Command line parsing */
var argv = minimist(process.argv.splice(2));

function usage() {
    console.log(" Usage: ", process.argv[1], "COMMAND");
    console.log("");
    console.log(" Commands:");
    console.log("    checkouts");
    console.log("    holds");
    console.log("    lists");
    console.log("    list [listid]");
}

if (argv._.length === 0) {
    usage();
    process.exit(-1);
}

var validCommands = { "checkouts": 1,
                      "holds": 1,
                      "lists": 1,
                      "list": 1 };

var command = argv._[0];
if (!validCommands[command]) {
    usage();
    process.exit(-1);
}

if (command === 'list') {
    if (argv._.length !== 2 || isNaN(argv._[1])) {
        usage();
        process.exit(-1);
    }
}

var sfpl = new SFPL();


async.series([
    function (cb) {
        console.log("Login");
        sfpl.login(config.user, config.pin, cb);
    },
    function (cb) {
        switch (command) {
        case "checkouts":
            sfpl.listCheckouts(function (err, listItems) {
                listItems.forEach(function (listItem, i) {
                    console.log("    ", i + 1, "-", listItem.title, listItem.status);
                });
                cb();
            });
            break;
        case "holds":
            sfpl.listHolds(function (err, listItems) {
                listItems.forEach(function (listItem, i) {
                    console.log("    ", i + 1, "-", listItem.title, listItem.status);
                });
                cb();
            });
            break;
        case "lists":
            sfpl.listUserLists(function (err, userlists) {
                userlists.forEach(function (listItem, i) {
                    var listNo = listItem.href.substr(listItem.href.lastIndexOf("=") + 1);
                    console.log("    ", i + 1, "-", listItem.listName, "(id: ", listNo, ")");
                });
                cb();
            });
            break;
        case "list":
            sfpl.getListContentsByListId(argv._[1], function (err, listItems) {
                listItems.forEach(function (listItem, i) {
                    console.log("    ", i + 1, "-", listItem.title);
                });
                cb();
            });
            break;
        }
    },
    function (cb) {
        console.log("Logout");
        sfpl.logout(function () {
            cb();
        });

    }
], function (err) {
    if (err) {
        console.log("Something went wrong:", err);
    }
});
