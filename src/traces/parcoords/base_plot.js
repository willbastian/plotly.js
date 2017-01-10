/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Registry = require('../../registry');


exports.name = 'paroords';

exports.plot = function(gd) {
    var Parcoords = Registry.getModule('parcoords');
    var cdParcoords = getCdModule(gd.calcdata, Parcoords);

    if(cdParcoords.length) Parcoords.plot(gd, cdParcoords);
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    oldFullLayout._glcontainer.selectAll('.parcoordsModel').remove();
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
