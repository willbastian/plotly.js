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
var d3 = require('d3');

module.exports = function plot(gd, cdparcoords) {

/*
    var canonicalSvg = d3.select(gd).select('svg.main-svg');

    canonicalSvg.append('rect')
        .attr('width', 1000)
        .attr('height', 1000);
*/

    var fullLayout = gd._fullLayout;
    var svgRoot = fullLayout._paper.node();
    var root = fullLayout._paperdiv.node();
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
        console.log('plotly_hover_test', eventData);
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
