/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var parcoords = require('./parcoords');
var Lib = require('../../lib');

module.exports = function plot(gd, cdparcoords) {

    var fullLayout = gd._fullLayout;
    var root = fullLayout._glcontainer.node();
    var data = cdparcoords.map(function(d, i) {
        var item = Lib.extendDeep(d[0]);
        item._gdDataItem = gd.data[i];
        return item;
    });

    var filterChanged = function() {
        gd.emit('plotly_restyle');
    };

    var hover = function(eventData) {
        gd.emit('plotly_hover', eventData);
    };

    parcoords(
        gd,
        root,
        data,
        {
            width: fullLayout.width,
            height: fullLayout.height
        },
        {
            filterChanged: filterChanged,
            hover: hover
        });
};
