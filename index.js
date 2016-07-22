'use strict';

const async        = require('async');
const deepEqual    = require('deep-equal');
const EventEmitter = require('events');
const kayvee       = require('kayvee');

module.exports = class ScienceSessionStore extends EventEmitter {
  constructor(control, candidate) {
    super();
    this.control = control;
    this.candidate = candidate;

    let logger = new kayvee.logger("science-session-store");
    this.gauge = logger.gauge.bind(logger);

    for (let meth of ['all', 'destroy', 'clear', 'length', 'get', 'set', 'touch']) {
      if (this.control[meth]) {
        this.add(meth);
      }
    }
  }

  add(meth) {
    this[meth] = (...args) => {
      // Isolate the arguments and the callback
      let sourceCb = args[args.length - 1];
      let rest = args.slice(0, -1);

      let start = Date.now()
      async.parallel({
        // For the control, invoke the control function, call the source callback with the
        // results, and return the timing and the results.
        control: (cb) => {
          this.control[meth].apply(this.control, rest.concat((...args) => {
            sourceCb.apply(null, args);
            cb.apply(null, [null].concat({arguments: args, time: Date.now()}));
          }));
        },
        // For the candidate, invoke the control function and return the timing and the results.
        candidate: (cb) => {
          this.candidate[meth].apply(this.candidate, rest.concat((...args) => {
            cb.apply(null, [null].concat({arguments: args, time: Date.now()}));
          }));
        }
      }, (err, results) => {
        if (err) {
          console.log("received error comparing which shouldn't be possible:", err);
          return
        }
        if (!deepEqual(results.control.arguments, results.candidate.arguments)) {
          console.log(`received different arguments between control (${JSON.stringify(results.control)}) and candidate (${JSON.stringify(results.candidate)})`);
        }
        this.gauge("difference", results.candidate.time - results.control.time);
      });
    }
  }
};
