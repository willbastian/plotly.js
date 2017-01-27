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

function colorScale(trace) {
    if(hasColorscale(trace, 'line')) {
        calcColorscale(trace, trace.line.color, 'line', 'c');
    }
}

module.exports = function calc(gd, trace) {
    var inputDimensions = trace.dimensions,
        dimensions = [];
    for(var i = 0; i < inputDimensions.length; i++) {

        dimensions.push({
            range: inputDimensions[i].range,
            constraintrange: inputDimensions[i].constraintrange,
            tickvals: inputDimensions[i].tickvals,
            ticktext: inputDimensions[i].ticktext,
            visible: inputDimensions[i].visible,
            label: inputDimensions[i].label,
            values: inputDimensions[i].values
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
        dimensions: dimensions,
        line: trace.line,
        pad: trace.pad
    }];
};
