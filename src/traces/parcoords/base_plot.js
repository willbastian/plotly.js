/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Registry = require('../../registry');
var xmlnsNamespaces = require('../../constants/xmlns_namespaces');
// var d3 = require('d3');

exports.name = 'parcoords';

exports.plot = function(gd) {
    var Parcoords = Registry.getModule('parcoords');
    var cdParcoords = getCdModule(gd.calcdata, Parcoords);

    if(cdParcoords.length) Parcoords.plot(gd, cdParcoords);
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    oldFullLayout._glcontainer.selectAll('.parcoordsModel').remove();
};

exports.toSVG = function(gd) {

    var canvas = document.querySelector('.parcoords-lines');

    var rect = canvas.getBoundingClientRect();

    var imageData = canvas.toDataURL('image/png');
    var image = gd._fullLayout._glimages.append('svg:image');
    image.attr({
        xmlns: xmlnsNamespaces.svg,
        'xlink:href': imageData,
        x: -rect.left,
        y: parseFloat(window.getComputedStyle(canvas, null).getPropertyValue('padding-top')) + rect.top
    });
};

function getCdModule(calcdata, _module) {
    var cdModule = [];

    for(var i = 0; i < calcdata.length; i++) {
        var cd = calcdata[i];
        var trace = cd[0].trace;

        if((trace._module === _module) && (trace.visible === true)) {
            cdModule.push(cd);
        }
    }

    return cdModule;
}
