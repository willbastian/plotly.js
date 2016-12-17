/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var parcoords = require('./parcoords');

module.exports = function plot(gd, cdparcoords) {

    var fullLayout = gd._fullLayout;
    var root = fullLayout._glcontainer.node();
    var data = cdparcoords.map(function(d) {return d[0];});

    var filterChangedCallback = function(value) {
        gd.emit('plotly_selected', value);
    };

    parcoords(
        root,
        data,
        {
            width: fullLayout.width,
            height: fullLayout.height
        },
        {
            filterChangedCallback: filterChangedCallback
        });
};
