var assert = require('assert');
var request = require('request').defaults({jar: true});
var cheerio = require('cheerio');

var SFPL_URL = 'https://sflib1.sfpl.org';
var LOGIN_URL = SFPL_URL + '/patroninfo';
var LOGOUT_URL = SFPL_URL + '/logout~S1?';

var HOLDS_PATH = '/holds';
var LISTS_PATH = '/mylists';
var ITEMS_PATH = '/items';

function ensureFullUrl(prefix, url) {
    assert(prefix);
    assert(url);

    if (url[0] === '/') {
        return prefix + url;
    }

    return url;
}

function SFPL() {
    // On login this will be completed to
    //   https://sflib1.sfpl.org/patroninfo~S1/1234567
    this.patronUrl = "";
}

SFPL.prototype.login = function (username, pin, callback) {
    var that = this;

    // AFAIK, this sets the credentials in the cookie jar
    var form = { form: { code: username, pin: pin}};
    request.post(LOGIN_URL, form, function (err, res) {
        if (res.statusCode && res.statusCode === 302) {
            that.patronUrl += res.headers.location.replace(/\/top$/, "");
        }

        callback(err, res.statusCode);
    });
};

SFPL.prototype.logout = function (callback) {
    request.get(LOGOUT_URL, callback);
};

SFPL.prototype.processPage = function (url, parsingFunction, callback) {
    if (url[0] === '/') {
        return callback(new Error("processPage must receive a fully qualified URL"));
    }

    request.get(url, function (err, res, body) {
        if (err) { return callback(err); }

        if (res.statusCode !== 200) {
            return callback(new Error("Page came with status" + res.statusCode));
        }

        parsingFunction(body, callback);
    });
};

SFPL.prototype.processPostPage = function (url, parsingFunction, callback) {
    if (url[0] === '/') {
        return callback(new Error("processPage must receive a fully qualified URL"));
    }

    request.post(url, function (err, res, body) {
        if (err) { return callback(err); }

        if (res.statusCode !== 200) {
            return callback(new Error("Page came with status" + res.statusCode));
        }

        parsingFunction(body, callback);
    });
};

/* callback(err, [{title:, href:, status}]) */
SFPL.prototype.listCheckouts = function (callback) {
    this.processPage(SFPL_URL + this.patronUrl + ITEMS_PATH, this.parseCheckoutsPage, callback);
};

/* callback(err, [{title:, href:, status}]) */
SFPL.prototype.listHolds = function (callback) {
    this.processPage(SFPL_URL + this.patronUrl + HOLDS_PATH, this.parseHoldsPage, callback);
};

/* callback(err, [{listName:, href:, description}]); */
SFPL.prototype.listUserLists = function (callback) {
    this.processPage(SFPL_URL + this.patronUrl + LISTS_PATH, this.parseUserListsPage, callback);
};

/* callback(err [{title:, href:, status:}] */
SFPL.prototype.listCheckouts = function (callback) {
    this.processPage(SFPL_URL + this.patronUrl + ITEMS_PATH, this.parseCheckoutsPage, callback);
};

/* getListContents returns can return full or local URL of each work. */
/* callback(err, [{location, callno, status}] */
SFPL.prototype.getWorkCopies = function (workUrl, callback) {
    var that = this;
    var url = workUrl;
    if (workUrl.indexOf("/record") === 0) {
        url = SFPL_URL + workUrl;
    }

    this.processPage(url, this.parseWorkPage, function (err, copies) {
        if (err && err.code === "MORE_COPIES_AVAILABLE") {
            that.processPostPage(err.followUrl, that.parseFullCopiesList, callback);
        } else {
            callback(err, copies);
        }
    });
};

/* listUserList returns lists urls as /patroninfo... so that is the format we expect here */
/* callback(err, [{title:, href:, status}]) */
SFPL.prototype.getListContents = function (listUrl, callback) {
    if (listUrl.indexOf("/patroninfo") !== 0) {
        return callback(new Error("listUrl should start in /patroninfo"));
    }
    this.processPage(SFPL_URL + listUrl, this.parseListPage, callback);
};

// In case we know already the listId (because it is static)
SFPL.prototype.getListContentsByListId = function (listId, callback) {
    assert(listId);
    var fullListUrl = this.patronUrl + LISTS_PATH + "?listNum=" + listId;
    this.getListContents(fullListUrl, callback);
};

SFPL.prototype.parseHoldsPage = function (page, callback) {
    var $ = cheerio.load(page);
    var holds = [];

    $("tr.patFuncEntry").map(function (index, tr) {
        var title = $(tr).children("td.patFuncTitle").text().trim();
        var href = $(tr).children("td.patFuncTitle").find("a").attr("href");
        var status = $(tr).children("td.patFuncStatus").text().trim();
        holds.push({ title: title, href: href, status: status});
    });

    callback(null, holds);
};

SFPL.prototype.parseWorkPage = function (page, callback) {
    var $ = cheerio.load(page);
    var copies = [];

    var form = $("div.itemlist center form");
    if (form.length) {
        //console.log("There are more copies", form.attr("action"));
        var err = new Error("There are more copies available");
        err.code = "MORE_COPIES_AVAILABLE";
        err.followUrl = ensureFullUrl(SFPL_URL, form.attr("action"));
        callback(err);
    } else {
        $("tr.bibItemsEntry").map(function (index, tr) {
            var location = $(tr).children("td:nth-child(1)").text().trim();
            var callno = $(tr).children("td:nth-child(2)").text().trim();
            var status = $(tr).children("td:nth-child(3)").text().trim();
            copies.push({location: location, callno: callno, status: status});
        });
        callback(null, copies);
    }
};

/* callback(err, [{location, callno, status}] */
SFPL.prototype.parseFullCopiesList = function (page, callback) {
    var $ = cheerio.load(page);
    var copies = [];

    $("tr.bibItemsEntry").map(function (index, tr) {
        var location = $(tr).children("td:nth-child(1)").text().trim();
        var callno = $(tr).children("td:nth-child(2)").text().trim();
        var status = $(tr).children("td:nth-child(3)").text().trim();
        copies.push({location: location, callno: callno, status: status});
    });
    callback(null, copies);
};

SFPL.prototype.parseListPage = function (page, callback) {
    var $ = cheerio.load(page);
    var items = [];

    $("tr.patFuncEntry td:nth-child(2)").map(function (index, item) {
        var title = $(item).text();
        var href = $(item).children("a").attr("href"); //.children("td:nth-child(2)").text().trim();
        items.push({title: title, href: href});
    });

    callback(null, items);
};

SFPL.prototype.parseUserListsPage = function (page, callback) {
    var $ = cheerio.load(page);
    var lists = [];

    $("tr.patFuncEntry").map(function (index, tr) {
        var listName = $(tr).children("td.patFuncTitle").text().trim();
        var href = ensureFullUrl(SFPL_URL, $(tr).children("td.patFuncTitle").find("a").attr("href"));
        var description = $(tr).children("td.patFuncDetails").text().trim();


        lists.push({ listName: listName, href: href, description: description});
    });

    callback(null, lists);
};


// Checkout page has same structure than holds page!
SFPL.prototype.parseCheckoutsPage = SFPL.prototype.parseHoldsPage;

module.exports = SFPL;
