# SFPL: San francisco public library

San Francisco public library (SFPL) web site doesn't offer an API to access
user data. This is a thin wrapper that logs in/out and access to that
data parsing the web pages. Not the nicest approach but it works.

At the moment only read operations are supported, being able to list user's
checkouts, holds, list and contents of lists.


# Usage

## Command line

Edit ./bin/sfpl.config.json and add there you user and pin.
Run $ ./bin/sfpl-cli [holds, checkouts, lists, ...]

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

---------------------------------------


# TODO

* Handle disconnections (timeout of cookies)
* Support for search
* Write support? (request an item, cancel a hold, ...)
