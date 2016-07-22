'use strict';

const assert              = require("assert");
const sinon               = require("sinon");
const ScienceSessionStore = require("../index.js");

describe("science session store", () => {
  it("takes in a control and a candidate", () => {
    new ScienceSessionStore({}, {});
  });

  it("only has the methods of the control", () => {
    let sss = new ScienceSessionStore({"all": "doesntmatter"}, {"destroy": "doesntmatter"});
    assert(sss.all);
    assert(!sss.destroy);
  });

  it("invokes a method on the control and the candidate", (done) => {
    let control = sinon.stub();
    let candidate = sinon.stub();
    let logger = sinon.stub();

    control.withArgs("sid").yields(null, 41);
    candidate.withArgs("sid").yields(null, 42);
    let sss = new ScienceSessionStore({"get": control}, {"get": candidate});
    sss.gauge = logger;

    sss.get("sid", (err, results) => {
      assert.ifError(err);
      assert.equal(results, 41);
      setTimeout(() => {
        assert.equal(logger.callCount, 1);
        done();
      }, 5);
    });
  });

  it("logs a timing difference when the results are the same", (done) => {
    // Don't use sinon so we can add a delay with settimeout
    let control = (thing, cb) => {
      assert.equal(thing, "sid");
      cb(null, 41);
    }
    let candidate = (thing, cb) => {
      assert.equal(thing, "sid");
      setTimeout(cb, 20, null, 41);
    }
    let logger = sinon.stub();

    let sss = new ScienceSessionStore({"get": control}, {"get": candidate});
    sss.gauge = logger;

    sss.get("sid", (err, results) => {
      assert.ifError(err);
      assert.equal(results, 41);
      setTimeout(() => {
        assert.equal(logger.callCount, 1);
        done();
      }, 30);
    });
  });
});
