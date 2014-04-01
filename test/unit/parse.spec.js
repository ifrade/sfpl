'use strict';

/* global describe: true */
/* global it: true */
/* global after: true */
/* global before: true */
/* jshint node: true */
var fs = require('fs');
var should = require('should');
var SFPL = require('../../lib/sfpl.js');

var HOLDS_PAGE = fs.readFileSync(__dirname + "/pages/holds.html").toString();
var WORK_PAGE = fs.readFileSync(__dirname + "/pages/a-work.html").toString();
var LIST_PAGE = fs.readFileSync(__dirname + "/pages/a-list.html").toString();
var USERLISTS_PAGE = fs.readFileSync(__dirname + "/pages/mylists.html").toString();
var CHECKOUTS_PAGE = fs.readFileSync(__dirname + "/pages/checkouts.html").toString();

describe('Parse SFPL pages', function () {

    var sfpl;
    before(function (done) {
        sfpl = new SFPL();
        done();
        //sfpl.login(done);
    });

    it('Holds page', function (done) {
        sfpl.parseHoldsPage(HOLDS_PAGE, function (err, holds) {
            should.not.exist(err);
            should.exist(holds);
            holds.length.should.equal(4);
            holds.forEach(function (hold) {
                hold.should.have.property("title");
                hold.should.have.property("href");
                hold.should.have.property("status");
            });
            done();
        });
    });

    it('Work page', function (done) {
        sfpl.parseWorkPage(WORK_PAGE, function (err, copies) {
            should.not.exist(err);
            should.exist(copies);
            copies.length.should.equal(8);
            copies.forEach(function (copy) {
                copy.should.have.property("location");
                copy.should.have.property("callno");
                copy.should.have.property("status");
            });
            done();
        });
    });

    it('Users list page', function (done) {
        sfpl.parseUserListsPage(USERLISTS_PAGE, function (err, lists) {
            should.not.exist(err);
            should.exist(lists);
            lists.length.should.equal(4);
            lists.forEach(function (list) {
                list.should.have.property("listName");
                list.should.have.property("href");
            });
            done();
        });
    });

    it('List page', function (done) {
        sfpl.parseListPage(LIST_PAGE, function (err, items) {
            should.not.exist(err);
            should.exist(items);
            items.length.should.equal(43);
            items.forEach(function (item) {
                item.should.have.property("title");
                item.should.have.property("href");
            });
            done();
        });
    });

    it('Checkouts page', function (done) {
        sfpl.parseCheckoutsPage(CHECKOUTS_PAGE, function (err, items) {
            should.not.exist(err);
            should.exist(items);
            items.length.should.equal(9);
            items.forEach(function (checkout) {
                checkout.should.have.property("title");
                checkout.should.have.property("href");
                checkout.should.have.property("status");
            });
            done();
        });
    });


    after(function (done) {
        done();
        //sfpl.logout(done);
    });
});
