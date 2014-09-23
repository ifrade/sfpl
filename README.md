# SFPL: San francisco public library

San Francisco public library (SFPL) web site doesn't offer an API to access
user data. This is a thin wrapper that logs in/out and access to that
data parsing the web pages. Not the nicest approach but it works.

At the moment only read operations are supported, being able to list user's
checkouts, holds, list and contents of lists.

This is a independent hobby project not related/supported/endorsed by the 
San Francisco Public Library.

# Usage

## Command line


```bash 
# Edit config file to set your user and pin
$ vi ./bin/sfpl.config.json
```

There are two command line tools in bin/:

* sfpl-cli.js to check holds, checkouts and lists
```bash
$ ./bin/sfpl-cli.js [holds|checkouts|lists|search]
```

* inLocation to check what books from a list are available in certain branch.
 Get list ids with "sfpl-cli lists" command. Select branch with first word
 of the branch name. E.g.:
```bash
$ ./bin/inLocation.js -l 12312 -b MARINA
```

## As library

```javascript
var SFPL = require('sfpl');

var sfpl = new SFPL();
sfpl.login("2000xxxxyyyyzzzzz", "pin", function (err) {
    // sfpl has now the cookies... you can ask other data
});
```

# API

### sfpl.login(username, pin, callback);
Connects to SFPL website and get the cookies that allow to run the other
methods.

__Arguments__
* `username` - string The number in the library card
* `pin` - string The pin used by the user to log in the web site
* `callback(err)` - function with an error if something went wrong.


### sfpl.logout();
Logs out the user (invalidates the cookies) from the SFPL website.


### sfpl.listCheckouts(callback);
List the books currently checked out by the user

__Arguments__
* `callback(err, books)` - function with an error if something went wrong and the list of
   books checked out. Each book is a JSON object with fields: `title`, `href` and `status`.
   href can be used directly in the [getWorkCopies](#sfplgetworkcopiesworkurl-callback) method.
   status contains as string the due date and other messages (renewed X times, fines).


### sfpl.listHolds(callback);
Returns the requests (holds list) of the user with the status of its items.

__Arguments__
* `callback(err, books)` - function with an error if something went wrong and the list of
   books requested. Each book is a JSON object with fields: `title`, `href` and `status`.
   href can be used directly in the [getWorkCopies](#sfplgetworkcopiesworkurl-callback) method.
   Status contains the string from the web page with messages like "XX of YY holds", "Must
   pick up by...", or "In transit".


### sfpl.listUserLists(callback);
Returns the lists the user has created in the SFPL site.

__Arguments__
* `callback(err, userlists)` - function with an error if something went wrong and the list of
   user lists. Each item has a `listName`, `description` and `href`. The `href` can be used
   directly in [getListContents](#sfplgetlistcontentslisturl-callback) to retrieve the
   items inside the list.


### sfpl.getWorkCopies(workUrl, callback);
Returns the list of locations where the book is registered and its status: CHECK SELF,
IN HOLDSHELF, DUE MM-DD-YYYY, and so on)

__Arguments__
* `workUrl` - string Url of the work, as it comes in the other calls (like [listCheckouts](#sfpllistcheckoutscallback)). 
* `callback(err, copies)` - function with an error if something went wrong and the list of
   copies for that book. Each item has a `location` (library name), `callno` (F STEIN) and
   `status` (CHECK SELF, DUE ..., MISSING, ...)


### sfpl.getListContents(listUrl, callback);
Returns the works inside a certain list. The list is identified by its URL (as returned in 
[listUserLists](#sfpllistuserlistscallback)).

__Arguments__
* `callback(err, books)` - function with an error if something went wrong and the list of
   books in the list. Each book is a JSON object with fields: `title`, `href` and `status`.
   href can be used directly in the sfpl.getWorkCopies method.

### sfpl.getListContentsByListId(listId, callback);
List id numbers are static, so if the id is known, this method can be used to retrieve
the contents, returning similar results as [sfpl.getListContents](#sfplgetlistcontentslisturl-callback).

__Arguments__
* `callback(err, books)` - function with an error if something went wrong and the list of
   books in the list. Each book is a JSON object with fields: `title`, `href` and `status`.
   href can be used directly in the sfpl.getWorkCopies method.

### sfpl.search(query, callback);
Free text search. Query can be a title, author or ISBN. It returns a JSON object with
fields `title`, `href`, `type`, `callno` and `cover`.

__Arguments__
* `query` - string Words to search, like title, author name or ISBN. What user would write
   in the search box in the web page.
* `callback(err, results)` - function with an error if something went wrong and the list of
   search results in the list. Each result is a JSON object with fields: `title`, `href`
   (to the work, can be used with [getWorkCopies](#sfplgetworkcopiesworkurl-callback)),
   `type` (Book, Audio CD, ...), `callno`, and `cover` (the URL of the cover image).


# Example

List the checkout books of the user:

```javascript
var SFPL = require('sfpl');

var sfpl = new SFPL();

sfpl.login("2000xxxxyyyyzzzzz", "pin", function (err) {

    sfpl.listCheckouts(function (err, books) {

        books.forEach(function (book, i) {
            console.log(i, "-", book.title, book.status);
        });

        sfpl.logout();
    });
});
```

The [command line tool code](https://github.com/ifrade/sfpl/blob/master/bin/sfpl-cli.js)
exercises most of the methods in the API.

# TODO

* Read full list of available copies (web page cuts after 7 or so)
* Handle disconnections (timeout of cookies)
* Support for search
* Write support? (request an item, cancel a hold, ...)
