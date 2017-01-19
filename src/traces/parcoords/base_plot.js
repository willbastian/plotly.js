/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Plots = require('../../plots/plots');
var Registry = require('../../registry');
var xmlnsNamespaces = require('../../constants/xmlns_namespaces');

exports.name = 'parcoords';

exports.attr = 'parcoords';

exports.idRoot = 'parcoords';

exports.idRegex = /^parcoords([2-9]|[1-9][0-9]+)?$/;

exports.attrRegex = /^parcoords([2-9]|[1-9][0-9]+)?$/;

exports.plot = function(gd) {
    var Parcoords = Registry.getModule('parcoords');
    var calcData = Plots.getSubplotCalcData(gd.calcdata, 'parcoords', void(0));

    if(calcData.length) Parcoords.plot(gd, calcData);
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    oldFullLayout._paperdiv.selectAll('.parcoords-line-layers').remove();
    oldFullLayout._paperdiv.selectAll('.parcoords-line-layers').remove();
    oldFullLayout._paperdiv.selectAll('.parcoords').remove();
    oldFullLayout._paperdiv.selectAll('.parcoords').remove();
};

exports.toSVG = function(gd) {

    function canvasToImage(canvas) {
        var rect = canvas.getBoundingClientRect();
        var compStyle = window.getComputedStyle(canvas, null);
        var canvasContentOriginX = parseFloat(compStyle.getPropertyValue('padding-left')) + rect.left;
        var canvasContentOriginY = parseFloat(compStyle.getPropertyValue('padding-top')) + rect.top;

        var imageData = canvas.toDataURL('image/png');
        var image = gd._fullLayout._glimages.append('svg:image');
        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            x: canvasContentOriginX,
            y: canvasContentOriginY
        });
    }

    var canvases = document.querySelectorAll('.parcoords-lines.context, .parcoords-lines.focus');

    canvases.forEach(canvasToImage);
};
