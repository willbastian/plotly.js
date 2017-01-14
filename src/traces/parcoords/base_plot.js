/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Registry = require('../../registry');
// var Plots = require('../../plots/plots');
// var xmlnsNamespaces = require('../../constants/xmlns_namespaces');


exports.name = 'parcoords';

exports.plot = function(gd) {
    var Parcoords = Registry.getModule('parcoords');
    var cdParcoords = getCdModule(gd.calcdata, Parcoords);

    if(cdParcoords.length) Parcoords.plot(gd, cdParcoords);
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    oldFullLayout._glcontainer.selectAll('.parcoordsModel').remove();
};

exports.toSVG = function(/* gd */) {


/*
    return;

    var Parcoords = Registry.getModule('parcoords');
    var cdParcoords = getCdModule(gd.calcdata, Parcoords);
    if(cdParcoords.length) Parcoords.plot(gd, cdParcoords);

    var fullLayout = gd._fullLayout,
        subplotIds = Plots.getSubplotIds(fullLayout, 'parcoords');

    debugger
    for(var i = 0; i < subplotIds.length; i++) {
        var subplot = fullLayout._plots[subplotIds[i]],
            scene = subplot._scene2d;

        var imageData = scene.toImage('png');
        var image = fullLayout._glimages.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            x: 0,
            y: 0,
            width: '100%',
            height: '100%',
            preserveAspectRatio: 'none'
        });

        scene.destroy();
    }
*/
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
