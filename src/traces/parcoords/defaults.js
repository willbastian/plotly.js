/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Lib = require('../../lib');
var attributes = require('./attributes');
var hasColorscale = require('../../components/colorscale/has_colorscale');
var colorscaleDefaults = require('../../components/colorscale/defaults');
var maxDimensionCount = require('./constants').maxDimensionCount;

var handleLineDefaults = function lineDefaults(traceIn, traceOut, defaultColor, layout, coerce) {

    coerce('line.color', defaultColor);
    coerce('line.colorscale');

    if(hasColorscale(traceIn, 'line')) {
        colorscaleDefaults(traceIn, traceOut, layout, coerce, {prefix: 'line.', cLetter: 'c'});
    }
    else {
        coerce('line.color', defaultColor);
    }
};

function dimensionsDefaults(traceIn, traceOut) {
    var dimensionsIn = traceIn.dimensions || [],
        dimensionsOut = traceOut.dimensions = [];

    var dimensionIn, dimensionOut, i;
    var commonLength = Infinity;

    if(dimensionsIn.length > maxDimensionCount) {
        Lib.log('parcoords traces support up to ' + maxDimensionCount + ' dimensions at the moment');
        dimensionsIn.splice(maxDimensionCount);
    }

    function coerce(attr, dflt) {
        return Lib.coerce(dimensionIn, dimensionOut, attributes.dimensions, attr, dflt);
    }

    for(i = 0; i < dimensionsIn.length; i++) {
        dimensionIn = dimensionsIn[i];
        dimensionOut = {};

        if(!Lib.isPlainObject(dimensionIn)) {
            continue;
        }

        var userVisible = coerce('visible');

        // turn dimensions with no data invisible
        var actuallyVisible = userVisible && Lib.isArray(dimensionIn.values) && dimensionIn.values.length > 0;

        if(actuallyVisible) {

            coerce('label');
            coerce('tickvals');
            coerce('ticktext');
            coerce('tickformat');
            coerce('range');
            coerce('constraintrange');
            coerce('values');

            commonLength = Math.min(commonLength, dimensionOut.values.length);

            dimensionOut._index = i;

        } else {

            dimensionOut = Lib.extendFlat({}, dimensionIn);

        }

        dimensionOut.visible = actuallyVisible;

        dimensionsOut.push(dimensionOut);
    }

    if(isFinite(commonLength)) {
        for(i = 0; i < dimensionsOut.length; i++) {
            dimensionOut = dimensionsOut[i];
            if(dimensionOut.visible && dimensionOut.values.length > commonLength) {
                dimensionOut.values = dimensionOut.values.slice(0, commonLength);
            }
        }
    }

    return dimensionsOut;
}


module.exports = function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    var dimensions = dimensionsDefaults(traceIn, traceOut);

    handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);

    coerce('domain.x');
    coerce('domain.y');

    if(!Array.isArray(dimensions) || !dimensions.length) {
        traceOut.visible = false;
    }
};
