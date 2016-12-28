/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var hasColorscale = require('../../components/colorscale/has_colorscale');
var calcColorscale = require('../../components/colorscale/calc');
var isNumeric = require('fast-isnumeric');
var d3 = require('d3');

// todo consider unifying common parts with e.g. `scatter`
function colorScale(trace) {
    if(hasColorscale(trace, 'line')) {
        calcColorscale(trace, trace.line.color, 'line', 'c');
    }
}

module.exports = function calc(gd, trace) {
    var vals = trace.dimensions,
        cd = [],
        i,
        v;
    for(i = 0; i < vals.length; i++) {
        v = vals.length - i;
        if(!isNumeric(v)) continue;
        v = +v;
        if(v < 0) continue;

        cd.push({
            v: v,
            i: i,
            range: vals[i].range,
            constraintrange: vals[i].constraintrange,
            integer: vals[i].integer,
            visible: vals[i].visible,
            label: vals[i].label,
            values: vals[i].values
        });
    }

    // todo should it be in defaults.js?
    colorScale(trace, trace.line.color, 'line', 'c');

    var colorStops = trace.line.colorscale.map(function(d) {return d[0];});
    var colorStrings = trace.line.colorscale.map(function(d) {return d[1];});
    var colorTuples = colorStrings.map(function(c) {return d3.rgb(c);});
    var prop = function(n) {return function(o) {return o[n];};};

    // We can't use d3 color interpolation as we may have non-uniform color palette raster
    // (various color stop distances).
    var polylinearUnitScales = 'rgb'.split('').map(function(key) {
        return d3.scale.linear()
            .clamp(true)
            .domain(colorStops)
            .range(colorTuples.map(prop(key)));
    });

    var colorToUnitScale = d3.scale.linear()
        .domain(d3.extent(trace.line.color));

    var unitMin = colorToUnitScale(trace.line.cmin);
    var unitMax = colorToUnitScale(trace.line.cmax);

    var cScale = d3.scale.linear()
        .clamp(true)
        .domain([unitMin, unitMax]);

    return [{
        id: trace.id,
        domain: trace.domain,
        dimensions: cd,
        tickdistance: trace.tickdistance,
        blocklinecount: trace.blocklinecount,
        line: trace.line,
        padding: trace.padding,
        unitToColor: function(d) {
            return polylinearUnitScales.map(function(s) {
                return s(cScale(d));
            });
        }
    }];
};
