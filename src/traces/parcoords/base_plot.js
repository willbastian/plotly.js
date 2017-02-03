/**
* Copyright 2012-2017, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var d3 = require('d3');
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
    oldFullLayout._glimages.selectAll('*').remove();
};

exports.toSVG = function(gd) {

    var bodyStyle = window.getComputedStyle(document.body, null);
    var imageRoot = gd._fullLayout._glimages;
    var root = d3.selectAll('.svg-container');
    var canvases = root.filter(function(d, i) {return i === 0;})
        .selectAll('.parcoords-lines.context, .parcoords-lines.focus');
    var snapshot = root[0].length > 1;

    function canvasToImage() {
        var canvas = this;
        var rect = canvas.getBoundingClientRect();
        var parentRect = canvas.parentElement.getBoundingClientRect();
        var canvasStyle = window.getComputedStyle(canvas, null);
        var canvasContentOriginX = parseFloat(canvasStyle.getPropertyValue('padding-left')) + (rect.left - parentRect.left);
        var canvasContentOriginY = parseFloat(canvasStyle.getPropertyValue('padding-top')) + (rect.top - parentRect.top);
        var imageData = canvas.toDataURL('image/png');
        var image = imageRoot.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            x: canvasContentOriginX - (snapshot ? 0 : parseFloat(bodyStyle.getPropertyValue('margin-left'))),
            y: canvasContentOriginY - (snapshot ? 0 : parseFloat(bodyStyle.getPropertyValue('margin-top'))),
            width: parseFloat(canvasStyle.getPropertyValue('width')),
            height: parseFloat(canvasStyle.getPropertyValue('height')),
            preserveAspectRatio: 'none'
        });
    }

    imageRoot.selectAll('*').remove();
    canvases.each(canvasToImage);

    // Chrome / Safari bug workaround - browser apparently loses connection to the defined pattern
    // Without the workaround, these browsers 'lose' the filter brush styling (color etc.) after a snapshot
    // on a subsequent interaction.
    // Firefox works fine without this workaround
    window.setTimeout(function() {
        d3.selectAll('#filterBarPattern')
            .attr('id', 'filterBarPattern');
    }, 0);
};
