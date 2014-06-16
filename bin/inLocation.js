var fs =  require('fs');
var SFPL = require('../lib/sfpl.js');
var async = require('async');
var sfpl = new SFPL();

var app = require('commander');

/* Load user name and pin from configuration file */
var CONFIG_FILE = __dirname + '/sfpl.config.json';
var DEFAULT_LOCATION = "MISSION BAY"; 
app.version('0.1.0')
    .usage('[options]')
    .description('Checks what books in one of your lists are available in certain location')
    .option('-u, --username [username]', 'SFPL Username')
    .option('-p, --pin [pin]', 'SFPL Pin')
    .option('-f, --file [filepath]', 'JSON file with credentials', CONFIG_FILE)
    .option('-b, --branch [name]', 'library branch you want to check', DEFAULT_LOCATION)
    .option('-l, --list [listid]', 'listid to check (can get with sfpl-cli)')
    .parse(process.argv);


var username;
var pin;
var location = app.branch;
var list = app.list;

if (app.username && app.pin) {
    username = app.username;
    pin = app.pin;
} else if (app.file) {
    console.log('Trying to load credentials from ' + app.file);
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

    username = config.user;
    pin = config.pin;
} else {
    console.log("Cannot load your library user and password");
    console.log("You can:");
    console.log("  A) Pass them in the command line : $ inLocation.js -u [user] -p [pin] ");
    console.log("  B) Write them in JSON file and  : $ inLocation.js -f [file] ");
    process.exit(-1);
}



function copyAvailableInLocation(copy) {
    return (copy.status === "CHECK SHELF" &&
            copy.location.indexOf(location) !== -1);
}

async.waterfall([
    function (cb) {
        console.log("1/4 - Login");
        sfpl.login(username, pin, cb);
    },
    function (statusCode, cb) {//53282 <- 4 books   //46191 <- to borrow
        console.log("2/4 - Getting works in list");
        sfpl.getListContentsByListId(app.list, cb);
    },
    function (itemsInList, cb) {
        if (!itemsInList || itemsInList.length === 0) {
            return cb(new Error("No contents in that list id."));
        }

        var msg = "3/4 - Getting copies for each work";
        process.stdout.write(msg);
        var total = itemsInList.length;
        var counter = 0;
        async.map(itemsInList, function (item, itemReady) {
            sfpl.getWorkCopies(item.href, function (err, copies) {
                counter += 1;
                process.stdout.write("\r" + msg + " (" + counter + "/" + total + ")");
                itemReady(err, {item: item, copies: copies});
            });
        }, cb);
    },
    function (itemsAndCopies, cb) {
        console.log("\n4/4 - Filtering available copies in", location);
        var shortlist = itemsAndCopies.filter(function (entry) {
            var usefulCopies = entry.copies.filter(copyAvailableInLocation);
            if (usefulCopies.length > 0) {
                entry.copies = usefulCopies;
                return true;
            }
            return false;
        });
        cb(null, shortlist);
    }, function (validItems, cb) {
        console.log("\n", validItems.length.toString(), " items in " + location);
        console.log("=========================================================");
        validItems.forEach(function (it, pos) {
            console.log((pos + 1).toString(), "-",  it.item.title);
            it.copies.forEach(function (copy) {
                console.log("\t", copy.location, copy.status, copy.callno);
            });
            console.log("");
        });
        cb();
    }
], function (err) {
    console.log("DONE.", err ? err.message: "");
});
