var test = require('tape');

test("SocketCleaner", function (t) {
  var SocketCleaner = require('../src/SocketCleaner');

  t.test('extrapolator', function (t) {
    var sc = new SocketCleaner({ extrapolationThreshold: 20 });
    var extrapolatorCalls = [];
    sc.setExtrapolator(function (diff) { extrapolatorCalls.push(diff); });

    sc.logTime(1000, 2000);
    sc.logTime(1100, 2100);
    sc.logTime(1200, 2200);
    t.deepEquals(extrapolatorCalls, [], 'isn\'t called when times are exact');

    sc.logTime(1300, 2315);
    sc.logTime(1400, 2430);
    t.deepEquals(extrapolatorCalls, [], 'isn\'t called when time differences below the threshold');

    sc.logTime(1500, 2630);
    t.deepEquals(extrapolatorCalls, [ 100 ], 'called when time is above threshold');

    sc.stop();
    t.end();
  });

  t.test('slowDown', function (t) {
    var sc = new SocketCleaner({
      slowDownThreshold: 50,
      slowDownAlpha: 0.2,
      rollingVarianceSampleSize: 5,
    });

    var slowDownCalls = 0;
    sc.on('slowDown', function() {slowDownCalls++; });

    sc.logTime(1000, 2000);
    sc.logTime(1100, 2150);
    sc.logTime(1200, 2170);
    sc.logTime(1300, 2320);
    sc.logTime(1400, 2400);
    sc.logTime(1500, 2550);
    t.equals(slowDownCalls, 0, 'isn\'t called when variance is small');

    sc.logTime(1600, 3550);
    sc.logTime(1700, 3650);
    t.equals(slowDownCalls, 1, 'is called when variance is large enough');

    sc.stop();
    t.end();
  });

  t.end();
})
