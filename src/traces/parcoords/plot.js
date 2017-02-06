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

    var gdDimensions = {};
    var gdDimensionsOriginalOrder = {};

    var fullLayout = gd._fullLayout;
    var svg = fullLayout._paper;
    var root = fullLayout._paperdiv;
    var data = cdparcoords.map(function(d, i) {
        var item = Lib.extendDeep(d[0]);
        gdDimensions[i] = gd.data[i].dimensions;
        gdDimensionsOriginalOrder[i] = gd.data[i].dimensions.slice();
        return item;
    });

    var filterChanged = function(i, originalDimensionIndex, newRange) {

        // Have updated `constraintrange` data on `gd.data` and raise `Plotly.restyle` event
        // without having to incur heavy UI blocking due to an actual `Plotly.restyle` call

        var gdDimension = gdDimensionsOriginalOrder[i][originalDimensionIndex];
        var gdConstraintRange = gdDimension.constraintrange;
        if(!gdConstraintRange || gdConstraintRange.length !== 2) {
            gdConstraintRange = gdDimension.constraintrange = [];
        }
        gdConstraintRange[0] = newRange[0];
        gdConstraintRange[1] = newRange[1];

        gd.emit('plotly_restyle');
    };

    var hover = function(eventData) {
        gd.emit('plotly_hover', eventData);
    };

    var unhover = function(eventData) {
        gd.emit('plotly_unhover', eventData);
    };

    var axesMoved = function(i, visibleIndices) {

        // Have updated order data on `gd.data` and raise `Plotly.restyle` event
        // without having to incur heavy UI blocking due to an actual `Plotly.restyle` call

        function newIdx(visibleIndices, orig, dim) {
            var origIndex = orig.indexOf(dim);
            var currentIndex = visibleIndices.indexOf(origIndex);
            if(currentIndex === -1) {
                // invisible dimensions go to the end, retaining their original order
                currentIndex += orig.length;
            }
            return currentIndex;
        }

        function sorter(orig) {
            return function sorter(d1, d2) {
                var i1 = newIdx(visibleIndices, orig, d1);
                var i2 = newIdx(visibleIndices, orig, d2);
                return i1 - i2;
            };
        }

        var orig = sorter(gdDimensionsOriginalOrder[i].filter(function(d) {return d.visible === void(0) || d.visible;}));
        gdDimensions[i].sort(orig);

        gd.emit('plotly_restyle');
    };

    parcoords(
        root,
        svg,
        data,
        {
            width: fullLayout.width,
            height: fullLayout.height
        },
        {
            filterChanged: filterChanged,
            hover: hover,
            unhover: unhover,
            axesMoved: axesMoved
        });
};
