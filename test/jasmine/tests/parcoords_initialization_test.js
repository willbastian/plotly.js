var Plots = require('@src/plots/plots');
var Parcoords = require('@src/traces/parcoords');
var attributes = require('@src/traces/parcoords/attributes');
var Lib = require('@src/lib');

describe('parcoords initialization tests', function() {

    'use strict';

    describe('parcoords defaults', function() {

        function _supply(traceIn) {
            var traceOut = { visible: true },
                defaultColor = '#444',
                layout = { };

            Parcoords.supplyDefaults(traceIn, traceOut, defaultColor, layout);

            return traceOut;
        }

        it('\'pad\' defaults should apply if missing', function() {
            var fullTrace = _supply({});
            expect(fullTrace.pad).toEqual({t: 80, r: 80, b: 80, l: 80});
        });

        it('\'pad\' properties should be default where not specified', function() {
            var fullTrace = _supply({ pad: {t: 10, r: 20, b: 30} });
            expect(fullTrace.pad).toEqual({t: 10, r: 20, b: 30, l: 80});
        });

        it('\'line\' specification should yield a default color', function() {
            var fullTrace = _supply({});
            expect(fullTrace.line.color).toEqual('#444');
        });

        it('\'colorscale\' should assume a default value if the \'color\' array is specified', function() {
            var fullTrace = _supply({
                line: {
                    color: [35, 63, 21, 42]
                },
                dimensions: [
                    {values: [321, 534, 542, 674]},
                    {values: [562, 124, 942, 189]},
                    {values: [287, 183, 385, 884]},
                    {values: [113, 489, 731, 454]}
                ]
            });
            expect(fullTrace.line).toEqual({
                color: [35, 63, 21, 42],
                colorscale: attributes.line.colorscale.dflt,
                cauto: true,
                autocolorscale: false,
                reversescale: false,
                showscale: false
            });
        });

        it('\'domain\' specification should have a default', function() {
            var fullTrace = _supply({});
            expect(fullTrace.domain).toEqual({x: [0, 1], y: [0, 1]});
        });

        it('\'dimension\' specification should have a default of an empty array', function() {
            var fullTrace = _supply({});
            expect(fullTrace.dimensions).toEqual([]);
        });

        it('\'dimension\' should be ignored if `values` are unsupported', function() {
            var fullTrace = _supply({
                dimensions: [{label: 'test dimension'}]
            });
            expect(fullTrace.dimensions).toEqual([]);
        });

        it('\'dimension\' should be used with default values where attributes are not provided', function() {
            var fullTrace = _supply({
                dimensions: [{values: []}]
            });
            expect(fullTrace.dimensions).toEqual([{values: [], visible: false, _index: 0}]);
        });

        it('\'dimension.values\' should get truncated to a common shortest length', function() {
            var fullTrace = _supply({dimensions: [
                {values: [321, 534, 542, 674]},
                {values: [562, 124, 942]},
                {values: [], visible: true}, // should be overwritten to false
                {values: [1, 2], visible: false} // shouldn't be truncated to as false
            ]});
            expect(fullTrace.dimensions).toEqual([
                {values: [321, 534, 542], visible: true, _index: 0},
                {values: [562, 124, 942], visible: true, _index: 1},
                {values: [], visible: false, _index: 2},
                {values: [1, 2], visible: false, _index: 3}
            ]);
        });
    });

    describe('parcoords calc', function() {

        function _calc(trace) {
            var gd = { data: [trace] };

            Plots.supplyDefaults(gd);

            var fullTrace = gd._fullData[0];
            return Parcoords.calc(gd, fullTrace);
        }

        var base = { type: 'parcoords' };

        it('\'colorscale\' should assume a default value if the \'color\' array is specified', function() {

            var fullTrace = _calc(Lib.extendDeep({}, base, {
                line: {
                    color: [35, 63, 21, 42]
                },
                dimensions: [
                    {values: [321, 534, 542, 674]},
                    {values: [562, 124, 942, 189]},
                    {values: [287, 183, 385, 884]},
                    {values: [113, 489, 731, 454]}
                ]
            }));

            expect(fullTrace[0].line).toEqual({
                color: [35, 63, 21, 42],
                colorscale: attributes.line.colorscale.dflt,
                cauto: true,
                cmin: 21,
                cmax: 63,
                autocolorscale: false,
                reversescale: false,
                showscale: false
            });
        });

        it('use a singular \'color\' if it is not an array', function() {

            var fullTrace = _calc(Lib.extendDeep({}, base, {
                line: {
                    color: '#444'
                },
                dimensions: [
                    {values: [321, 534, 542, 674]},
                    {values: [562, 124, 942, 189]}
                ]
            }));

            expect(fullTrace[0].line).toEqual({
                color: [0.5, 0.5, 0.5, 0.5],
                colorscale: [[0, '#444'], [1, '#444']],
                cmin: 0,
                cmax: 1
            });
        });

        it('use a singular \'color\' even if a \'colorscale\' is supplied', function() {

            var fullTrace = _calc(Lib.extendDeep({}, base, {
                line: {
                    color: '#444',
                    colorscale: 'Jet'
                },
                dimensions: [
                    {values: [321, 534, 542, 674]},
                    {values: [562, 124, 942, 189]}
                ]
            }));

            expect(fullTrace[0].line).toEqual({
                color: [0.5, 0.5, 0.5, 0.5],
                colorscale: [[0, '#444'], [1, '#444']],
                autocolorscale: false,
                showscale: false,
                reversescale: false,
                cauto: true,
                cmin: 0,
                cmax: 1
            });
        });
    });
});
