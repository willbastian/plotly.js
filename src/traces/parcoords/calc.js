/**
* Copyright 2012-2017, Plotly, Inc.
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
            tickvals: vals[i].tickvals,
            ticktext: vals[i].ticktext,
            visible: vals[i].visible,
            label: vals[i].label,
            values: vals[i].values
        });
    }

    colorScale(trace, trace.line.color, 'line', 'c');

    var cs = !!trace.line.colorscale;

    var cscale = cs ? trace.line.colorscale : [[0, trace.line.color], [1, trace.line.color]];
    var cmin = trace.line.cmin === void(0) ? 0 : trace.line.cmin;
    var cmax = trace.line.cmax === void(0) ? 1 : trace.line.cmax;
    var color = cs ? trace.line.color : Array.apply(0, Array(trace.dimensions.reduce(function(p, n) {return Math.max(p, n.values.length);}, 0))).map(function() {return 0.5;});

    trace.line.color = color;
    trace.line.colorscale = cscale;

    var colorStops = cscale.map(function(d) {return d[0];});
    var colorStrings = cscale.map(function(d) {return d[1];});
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
        .domain(d3.extent(color));

    var unitMin = colorToUnitScale(cmin);
    var unitMax = colorToUnitScale(cmax);

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
