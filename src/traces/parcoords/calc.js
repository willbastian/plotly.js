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

function colorScale(trace) {
    if(hasColorscale(trace, 'line')) {
        calcColorscale(trace, trace.line.color, 'line', 'c');
    }
}

function finite(x) {
    return isNaN(x) || !isFinite(x) ? 0 : x;
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
            range: vals[i].range && vals[i].range.map(finite),
            constraintrange: vals[i].constraintrange && vals[i].constraintrange.map(finite),
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
    var color = cs ? trace.line.color : Array.apply(0, Array(trace.dimensions.reduce(function(p, n) {return Math.max(p, n.values.length);}, 0))).map(function() {return 0.5;});

    trace.line.color = color;
    trace.line.colorscale = cscale;

    return [{
        domain: trace.domain,
        dimensions: cd,
        blocklinecount: trace.blocklinecount,
        line: trace.line,
        padding: trace.padding
    }];
};
