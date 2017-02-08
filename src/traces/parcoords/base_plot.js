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
var parcoordsPlot = require('./plot');
var xmlnsNamespaces = require('../../constants/xmlns_namespaces');

exports.name = 'parcoords';

exports.attr = 'type';

exports.plot = function(gd) {
    var calcData = Plots.getSubplotCalcData(gd.calcdata, 'parcoords', 'parcoords');
    if(calcData.length) parcoordsPlot(gd, calcData);
};

exports.clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var hadParcoords = (oldFullLayout._has && oldFullLayout._has('parcoords'));
    var hasParcoords = (newFullLayout._has && newFullLayout._has('parcoords'));

    if(hadParcoords && !hasParcoords) {
        oldFullLayout._paperdiv.selectAll('.parcoords-line-layers').remove();
        oldFullLayout._paperdiv.selectAll('.parcoords-line-layers').remove();
        oldFullLayout._paperdiv.selectAll('.parcoords').remove();
        oldFullLayout._paperdiv.selectAll('.parcoords').remove();
        oldFullLayout._glimages.selectAll('*').remove();
    }
};

exports.toSVG = function(gd) {

    var imageRoot = gd._fullLayout._glimages;
    var root = d3.selectAll('.svg-container');
    var canvases = root.filter(function(d, i) {return i === 0;})
        .selectAll('.parcoords-lines.context, .parcoords-lines.focus');

    function canvasToImage() {
        var canvas = this;
        var rect = canvas.getBoundingClientRect();
        var parentRect = canvas.parentElement.getBoundingClientRect();
        var canvasStyle = window.getComputedStyle(canvas, null);
        var parentStyle = window.getComputedStyle(canvas.parentElement, null);
        var canvasOffset = parentStyle.getPropertyValue('transform').split(')')[0].split(',').slice(-2)
            .map(function(s) {return parseFloat(s);});
        var canvasContentOriginX = parseFloat(canvasStyle.getPropertyValue('padding-left')) + (rect.left - parentRect.left) + canvasOffset[0];
        var canvasContentOriginY = parseFloat(canvasStyle.getPropertyValue('padding-top')) + (rect.top - parentRect.top) + canvasOffset[1];
        var imageData = canvas.toDataURL('image/png');
        var image = imageRoot.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            x: canvasContentOriginX,
            y: canvasContentOriginY,
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
