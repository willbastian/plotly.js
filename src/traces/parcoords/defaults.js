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

var handleLineDefaults = function lineDefaults(traceIn, traceOut, defaultColor, layout, coerce) {
    var markerColor = (traceIn.marker || {}).color;

    coerce('line.color', defaultColor);

    if(hasColorscale(traceIn, 'line')) {
        colorscaleDefaults(traceIn, traceOut, layout, coerce, {prefix: 'line.', cLetter: 'c'});
    }
    else {
        var lineColorDflt = (Array.isArray(markerColor) ? false : markerColor) || defaultColor;
        coerce('line.color', lineColorDflt);
    }
};


function dimensionsDefaults(traceIn, traceOut) {
    var dimensionsIn = traceIn.dimensions || [],
        dimensionsOut = traceOut.dimensions = [];

    var dimensionIn, dimensionOut;

    dimensionsIn.splice(63); // parcoords supports up to 63 dimensions

    function coerce(attr, dflt) {
        return Lib.coerce(dimensionIn, dimensionOut, attributes.dimensions, attr, dflt);
    }

    for(var i = 0; i < dimensionsIn.length; i++) {
        dimensionIn = dimensionsIn[i];
        dimensionOut = {};

        if(!Lib.isPlainObject(dimensionIn) || !Array.isArray(dimensionIn.values)) {
            continue;
        }

        coerce('label');
        coerce('tickvals');
        coerce('ticktext');
        coerce('visible');
        coerce('range');
        coerce('constraintrange');
        coerce('values');

        dimensionOut._index = i;
        dimensionsOut.push(dimensionOut);
    }

    return dimensionsOut;
}


module.exports = function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    var dimensions = dimensionsDefaults(traceIn, traceOut);

    if(!Array.isArray(dimensions) || !dimensions.length) {
        traceOut.visible = false;
        return;
    }

    handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);

    coerce('tickdistance');
    coerce('padding');
    coerce('blocklinecount');

    coerce('domain.x');
    coerce('domain.y');

    coerce('line.color', defaultColor);
    coerce('line.focusopacity');
    coerce('line.contextopacity');
    coerce('line.pixelratio');
    coerce('line.focusalphablending');
};
